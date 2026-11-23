import { getPublicSeoSettings, getSiteUrl } from "@/lib/seo-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 1000;
const MAX_SITEMAP_URLS = 50000;

async function fetchAllRows(query) {
  const rows = [];

  for (let offset = 0; offset < MAX_SITEMAP_URLS; offset += PAGE_SIZE) {
    const { data, error } = await query.range(
      offset,
      Math.min(offset + PAGE_SIZE - 1, MAX_SITEMAP_URLS - 1),
    );

    if (error) {
      throw new Error(`Sitemap content query failed: ${error.message}`);
    }

    rows.push(...(data || []));

    if (!data || data.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

function getCategoryPath(category, categoryMap) {
  const slugs = [];
  const visited = new Set();
  let current = category;

  while (current) {
    if (visited.has(current.id)) {
      return null;
    }

    visited.add(current.id);
    slugs.push(current.slug);

    if (!current.parent_id) {
      return slugs.reverse();
    }

    current = categoryMap.get(current.parent_id);

    // A missing parent means the category hierarchy is incomplete
    // or its parent is not published.
    if (!current) {
      return null;
    }
  }

  return null;
}

function getLastModified(...values) {
  for (const value of values) {
    if (!value) continue;

    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return undefined;
}

export default async function sitemap() {
  const settings = await getPublicSeoSettings();

  if (!settings.search_indexing_enabled || !settings.sitemap_enabled) {
    return [];
  }

  const siteUrl = getSiteUrl();
  const siteOrigin = new URL(siteUrl).origin;
  const supabase = createSupabaseAdminClient();
  const sitemapEntries = [
    {
      url: `${siteUrl}/`,
    },
    {
      url: `${siteUrl}/articles`,
    },
  ];

  let categoryMap = new Map();

  if (settings.include_categories || settings.include_articles) {
    const categories = await fetchAllRows(
      supabase
        .from("categories")
        .select("id, parent_id, slug, status")
        .eq("status", "published")
        .order("id", { ascending: true }),
    );

    categoryMap = new Map(
      categories.map((category) => [category.id, category]),
    );

    if (settings.include_categories) {
      for (const category of categories) {
        const path = getCategoryPath(category, categoryMap);

        if (!path) continue;

        sitemapEntries.push({
          url: `${siteUrl}/category/${path
            .map((slug) => encodeURIComponent(slug))
            .join("/")}`,
        });

        if (sitemapEntries.length >= MAX_SITEMAP_URLS) {
          return sitemapEntries.slice(0, MAX_SITEMAP_URLS);
        }
      }
    }
  }

  if (settings.include_articles) {
    const now = new Date().toISOString();

    const articles = await fetchAllRows(
      supabase
        .from("articles")
        .select(
          "id, slug, category_id, canonical_url, published_at, updated_at, no_index",
        )
        .eq("status", "published")
        .not("published_at", "is", null)
        .lte("published_at", now)
        .order("id", { ascending: true }),
    );

    const seenUrls = new Set(sitemapEntries.map((entry) => entry.url));

    for (const article of articles) {
      if (article.no_index === true || !article.category_id) {
        continue;
      }

      const category = categoryMap.get(article.category_id);

      // Only include articles whose category and complete parent
      // hierarchy are published.
      if (!category || !getCategoryPath(category, categoryMap)) {
        continue;
      }

      let articleUrl;

      if (article.canonical_url) {
        try {
          // Canonical URLs must be absolute HTTP or HTTPS URLs.
          const canonicalUrl = new URL(article.canonical_url);

          if (
            !["http:", "https:"].includes(canonicalUrl.protocol) ||
            !canonicalUrl.hostname ||
            canonicalUrl.username ||
            canonicalUrl.password ||
            canonicalUrl.origin !== siteOrigin
          ) {
            continue;
          }

          articleUrl = canonicalUrl.href;
        } catch {
          // Ignore malformed legacy canonical URLs without failing the sitemap.
          continue;
        }
      } else {
        articleUrl = `${siteUrl}/articles/${encodeURIComponent(article.slug)}`;
      }

      if (seenUrls.has(articleUrl)) {
        continue;
      }

      seenUrls.add(articleUrl);

      sitemapEntries.push({
        url: articleUrl,
        lastModified: getLastModified(article.updated_at, article.published_at),
      });

      if (sitemapEntries.length >= MAX_SITEMAP_URLS) {
        break;
      }
    }
  }

  return sitemapEntries.slice(0, MAX_SITEMAP_URLS);
}
