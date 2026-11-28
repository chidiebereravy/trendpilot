import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { connection } from "next/server";

const ARTICLE_FIELDS =
  "id, title, slug, excerpt, content, category_id, author_id, featured_image_path, seo_title, seo_description, focus_keyword, canonical_url, no_index, published_at, created_at, updated_at";

const CATEGORY_FIELDS =
  "id, parent_id, name, slug, level, status, description, seo_title, seo_description, display_order";

function extractArticleText(content) {
  const parts = [];

  function visit(node) {
    if (!node || typeof node !== "object") return;

    // Legacy article blocks.
    if (typeof node.text === "string") {
      parts.push(node.text);
    }

    if (Array.isArray(node.items)) {
      parts.push(...node.items.filter((item) => typeof item === "string"));
    }

    // TipTap FAQ sections store questions and answers in attrs.items.
    if (Array.isArray(node.attrs?.items)) {
      for (const item of node.attrs.items) {
        if (typeof item.question === "string") {
          parts.push(item.question);
        }

        if (typeof item.answer === "string") {
          parts.push(item.answer);
        }
      }
    }

    if (Array.isArray(node.content)) {
      node.content.forEach(visit);
    }
  }

  visit(content);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

async function resolvePublishedArticleImages(supabase, content) {
  if (!content || typeof content !== "object") return content;

  const resolvedContent = JSON.parse(JSON.stringify(content));
  const imageNodes = [];

  function collectImages(node) {
    if (!node || typeof node !== "object") return;

    if (
      node.type === "image" &&
      node.attrs?.mediaId &&
      node.attrs?.objectPath
    ) {
      imageNodes.push(node);
    }

    if (Array.isArray(node.content)) {
      node.content.forEach(collectImages);
    }
  }

  collectImages(resolvedContent);

  const mediaIds = [...new Set(imageNodes.map((node) => node.attrs.mediaId))];

  if (!mediaIds.length) return resolvedContent;

  const { data, error } = await supabase
    .from("media_assets")
    .select("id, object_path")
    .in("id", mediaIds)
    .eq("bucket_id", "trendpilot-media")
    .eq("status", "published")
    .eq("purpose", "article");

  if (error) {
    console.error("Public article image lookup failed:", error);
    return resolvedContent;
  }

  const mediaMap = new Map((data || []).map((item) => [item.id, item]));

  for (const node of imageNodes) {
    const media = mediaMap.get(node.attrs.mediaId);

    // The saved object path must match the published media record.
    if (!media || media.object_path !== node.attrs.objectPath) continue;

    const imageUrl = getPublicImageUrl(supabase, media.object_path);

    if (imageUrl) {
      node.attrs.src = imageUrl;
    }
  }

  return resolvedContent;
}

export function getArticleReadingTime(content) {
  const text = extractArticleText(content);
  const words = text ? text.split(/\s+/).length : 0;

  return Math.max(1, Math.ceil(words / 200));
}

export function getPublicImageUrl(supabase, imagePath) {
  if (!imagePath) return null;

  const { data } = supabase.storage
    .from("trendpilot-media")
    .getPublicUrl(imagePath);

  return data?.publicUrl || null;
}

export function getArticleExcerpt(article) {
  if (article?.excerpt?.trim()) return article.excerpt.trim();

  const text = extractArticleText(article?.content);

  if (text.length <= 180) return text;

  return `${text.slice(0, 177).trimEnd()}...`;
}

export async function getPublishedCategories() {
  await connection();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_FIELDS)
    .eq("status", "published")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(1500);

  if (error) {
    console.error("Public category query failed:", error);
    return [];
  }

  return data || [];
}

export async function getPublishedCategoryPath(slugs) {
  if (!Array.isArray(slugs) || slugs.length === 0) return null;

  const categories = await getPublishedCategories();
  let parentId = null;
  let selected = null;

  for (let index = 0; index < slugs.length; index += 1) {
    const slug = slugs[index];

    selected = categories.find(
      (category) => category.slug === slug && category.parent_id === parentId,
    );

    if (!selected) return null;

    parentId = selected.id;
  }

  return selected;
}

export function getCategoryAncestors(category, categories) {
  const ancestors = [];
  let current = category;

  while (current) {
    ancestors.unshift(current);

    if (!current.parent_id) break;

    current = categories.find((item) => item.id === current.parent_id);

    if (!current) return [];
  }

  return ancestors;
}

export function getCategoryPathname(slugs) {
  if (!Array.isArray(slugs) || slugs.length === 0) {
    return "/articles";
  }

  return `/category/${slugs.map((slug) => encodeURIComponent(slug)).join("/")}`;
}

export function getCategoryUrl(category, categories) {
  const ancestors = getCategoryAncestors(category, categories);

  if (!ancestors.length) return "/articles";

  return getCategoryPathname(ancestors.map((item) => item.slug));
}

export function getCategoryDescendantMicroIds(category, categories) {
  const descendants = new Set([category.id]);

  let changed = true;

  while (changed) {
    changed = false;

    for (const item of categories) {
      if (item.parent_id && descendants.has(item.parent_id)) {
        if (!descendants.has(item.id)) {
          descendants.add(item.id);
          changed = true;
        }
      }
    }
  }

  return categories
    .filter((item) => item.level === "micro" && descendants.has(item.id))
    .map((item) => item.id);
}

export async function getPublishedArticles({ limit = 12, categoryIds } = {}) {
  await connection();
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("articles")
    .select(ARTICLE_FIELDS)
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(limit);

  if (Array.isArray(categoryIds)) {
    if (categoryIds.length === 0) return [];

    query = query.in("category_id", categoryIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Public article query failed:", error);
    return [];
  }

  const articles = data || [];
  if (!articles.length) return [];

  const categories = await getPublishedCategories();

  const categoryMap = new Map(
    categories.map((category) => [category.id, category]),
  );

  return articles.map((article) => {
    const category = categoryMap.get(article.category_id) || null;

    return {
      ...article,
      category,
      categoryUrl: category
        ? getCategoryUrl(category, categories)
        : "/articles",
      imageUrl: getPublicImageUrl(supabase, article.featured_image_path),
      excerptText: getArticleExcerpt(article),
      readingTime: getArticleReadingTime(article.content),
    };
  });
}

export async function getPublishedArticleBySlug(slug) {
  await connection();

  const supabase = await createSupabaseServerClient();

  const { data: article, error } = await supabase
    .from("articles")
    .select(ARTICLE_FIELDS)
    .eq("slug", slug)
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error("Public article detail query failed:", error);
    return null;
  }

  if (!article) return null;

  const { data: category } = await supabase
    .from("categories")
    .select(CATEGORY_FIELDS)
    .eq("id", article.category_id)
    .eq("status", "published")
    .maybeSingle();

  if (!category) return null;

  const categories = await getPublishedCategories();
  const resolvedContent = await resolvePublishedArticleImages(
    supabase,
    article.content,
  );

  return {
    ...article,
    content: resolvedContent,
    category,
    categoryPath: getCategoryAncestors(category, categories),
    author: null,
    imageUrl: getPublicImageUrl(supabase, article.featured_image_path),
    excerptText: getArticleExcerpt(article),
    readingTime: getArticleReadingTime(article.content),
    categoryUrl: getCategoryUrl(category, categories),
  };
}

export async function getPublishedArticlesPage({
  page = 1,
  pageSize = 12,
  categoryIds = [],
} = {}) {
  await connection();

  const supabase = await createSupabaseServerClient();

  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safePageSize = Math.min(
    24,
    Math.max(1, Math.floor(Number(pageSize) || 12)),
  );

  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    return {
      articles: [],
      total: 0,
      page: safePage,
      pageSize: safePageSize,
      totalPages: 1,
    };
  }

  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const { data, error, count } = await supabase
    .from("articles")
    .select(ARTICLE_FIELDS, { count: "exact" })
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .in("category_id", categoryIds)
    .order("published_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Paginated public article query failed:", error);

    return {
      articles: [],
      total: 0,
      page: safePage,
      pageSize: safePageSize,
      totalPages: 1,
    };
  }

  const articles = data || [];
  const total = count || 0;

  if (articles.length === 0) {
    return {
      articles: [],
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  const categories = await getPublishedCategories();

  const categoryMap = new Map(
    categories.map((category) => [category.id, category]),
  );

  const enrichedArticles = articles.map((article) => {
    const category = categoryMap.get(article.category_id) || null;

    return {
      ...article,
      category,
      categoryUrl: category
        ? getCategoryUrl(category, categories)
        : "/articles",
      imageUrl: getPublicImageUrl(supabase, article.featured_image_path),
      excerptText: getArticleExcerpt(article),
      readingTime: getArticleReadingTime(article.content),
    };
  });

  return {
    articles: enrichedArticles,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

export async function searchPublishedArticles({ query, limit = 24 } = {}) {
  await connection();

  const searchTerm = typeof query === "string" ? query.trim() : "";

  if (!searchTerm || searchTerm.length < 2) {
    return [];
  }

  const supabase = await createSupabaseServerClient();

  const safeLimit = Math.min(48, Math.max(1, Math.floor(Number(limit) || 24)));

  // Escape SQL LIKE wildcard characters so they are treated literally.
  const pattern = `%${searchTerm.replace(/[\\%_]/g, "\\$&")}%`;

  const searchableFields = [
    "title",
    "excerpt",
    "seo_title",
    "seo_description",
    "focus_keyword",
  ];

  const results = await Promise.all(
    searchableFields.map((field) =>
      supabase
        .from("articles")
        .select(ARTICLE_FIELDS)
        .eq("status", "published")
        .not("published_at", "is", null)
        .lte("published_at", new Date().toISOString())
        .ilike(field, pattern)
        .order("published_at", { ascending: false })
        .limit(safeLimit),
    ),
  );

  const articlesById = new Map();

  for (const result of results) {
    if (result.error) {
      console.error("Public article search failed:", result.error);
      continue;
    }

    for (const article of result.data || []) {
      articlesById.set(article.id, article);
    }
  }

  const articles = [...articlesById.values()]
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    )
    .slice(0, safeLimit);

  if (!articles.length) {
    return [];
  }

  const categories = await getPublishedCategories();

  const categoryMap = new Map(
    categories.map((category) => [category.id, category]),
  );

  return articles
    .map((article) => {
      const category = categoryMap.get(article.category_id) || null;

      // Do not expose articles whose category is not publicly available.
      if (!category) return null;

      return {
        ...article,
        category,
        categoryUrl: getCategoryUrl(category, categories),
        imageUrl: getPublicImageUrl(supabase, article.featured_image_path),
        excerptText: getArticleExcerpt(article),
        readingTime: getArticleReadingTime(article.content),
      };
    })
    .filter(Boolean);
}
