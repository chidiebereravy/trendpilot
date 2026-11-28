import { requireRole, AuthError } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import {
  articleListFiltersSchema,
  createArticleSchema,
} from "@/features/articles/schemas/article.schema";
import { slugify } from "@/lib/utils";
import {
  createNotificationSafely,
  createNotificationsForRolesSafely,
} from "@/features/notifications/services/notification.service";
import { validateArticleMedia } from "@/features/articles/services/article-media-validation";

const articleFields =
  "id, title, slug, excerpt, content, category_id, author_id, created_by, status, featured_image_path, seo_title, seo_description, focus_keyword, canonical_url, no_index, published_at, scheduled_at, reviewed_by, reviewed_at, created_at, updated_at";

function handleDatabaseError(error) {
  if (error.code === "23505") {
    throw new AuthError(
      "An article with this slug already exists. Choose a different slug.",
      409,
      "ARTICLE_SLUG_EXISTS",
    );
  }

  if (error.code === "23503") {
    throw new AuthError(
      "The selected author or category is no longer available.",
      409,
      "ARTICLE_REFERENCE_INVALID",
    );
  }

  if (error.code === "23514" || error.code === "P0001") {
    throw new AuthError(
      error.message || "The article violates an editorial publishing rule.",
      422,
      "ARTICLE_RULE_VIOLATION",
    );
  }

  if (error.code === "42501") {
    throw new AuthError(
      "You do not have permission to perform this operation.",
      403,
      "ARTICLE_PERMISSION_DENIED",
    );
  }

  if (error.code === "23502") {
    throw new AuthError(
      "A required article field is missing.",
      422,
      "ARTICLE_REQUIRED_FIELD_MISSING",
    );
  }

  throw error;
}

export async function GET(request) {
  try {
    const { supabase, user, profile } = await requireRole([
      "author",
      "editor",
      "admin",
    ]);

    const url = new URL(request.url);

    const rawFilters = Object.fromEntries(url.searchParams.entries());
    const filterResult = articleListFiltersSchema.safeParse(rawFilters);

    if (!filterResult.success) {
      throw filterResult.error;
    }

    const filters = filterResult.data;
    const isAuthor = profile.role === "author";

    let query = supabase
      .from("articles")
      .select(articleFields, { count: "exact" })
      .order(filters.sort, {
        ascending: filters.order === "asc",
        nullsFirst: false,
      });

    if (isAuthor) {
      query = query.eq("author_id", user.id);
    } else if (filters.authorId) {
      query = query.eq("author_id", filters.authorId);
    }

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.categoryId) {
      query = query.eq("category_id", filters.categoryId);
    }

    if (filters.search) {
      query = query.ilike("title", `%${filters.search}%`);
    }

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    const total = count ?? 0;

    return successResponse({
      items: data ?? [],
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.ceil(total / filters.pageSize),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const { supabase, user, profile } = await requireRole([
      "author",
      "editor",
      "admin",
    ]);

    const body = await readValidatedBody(request, createArticleSchema);

    const isAuthor = profile.role === "author";

    if (isAuthor && body.authorId && body.authorId !== user.id) {
      throw new AuthError(
        "Authors can only create articles under their own profile.",
        403,
        "ARTICLE_AUTHOR_ASSIGNMENT_FORBIDDEN",
      );
    }

    if (isAuthor && !["draft", "in_review"].includes(body.status)) {
      throw new AuthError(
        "Authors can only create draft or review-submission articles.",
        403,
        "ARTICLE_STATUS_FORBIDDEN",
      );
    }

    await validateArticleMedia({
      supabase,
      user,
      role: profile.role,
      content: body.content,
      featuredImagePath: body.featuredImagePath ?? null,
    });

    const authorId = isAuthor ? user.id : body.authorId || user.id;
    const slug = body.slug || slugify(body.title);

    if (!slug) {
      throw new AuthError(
        "A valid article slug could not be generated from the title.",
        422,
        "INVALID_ARTICLE_SLUG",
      );
    }

    const { data, error } = await supabase
      .from("articles")
      .insert({
        title: body.title,
        slug,
        excerpt: body.excerpt ?? null,
        content: body.content,
        category_id: body.categoryId,
        author_id: authorId,
        status: body.status,
        featured_image_path: body.featuredImagePath ?? null,
        seo_title: body.seoTitle ?? null,
        seo_description: body.seoDescription ?? null,
        focus_keyword: body.focusKeyword ?? null,
        canonical_url: body.canonicalUrl ?? null,
        no_index: body.noIndex,
        scheduled_at: body.scheduledAt ?? null,
      })
      .select(articleFields)
      .single();

    if (error) handleDatabaseError(error);

    if (data.status === "in_review" && profile.role === "author") {
      await createNotificationsForRolesSafely({
        roles: ["editor", "admin"],
        actorId: user.id,
        type: "moderation",
        title: "Article submitted for review",
        message: `"${data.title}" is ready for editorial review.`,
        actionUrl: "/dashboard/articles",
        metadata: {
          event: "article_submitted_for_review",
          articleId: data.id,
          articleTitle: data.title,
        },
        dedupeKey: `article:${data.id}:submitted-for-review:${data.updated_at}`,
      });
    }

    if (
      ["editor", "admin"].includes(profile.role) &&
      ["published", "scheduled"].includes(data.status) &&
      data.author_id !== user.id
    ) {
      const isPublished = data.status === "published";

      await createNotificationSafely({
        userId: data.author_id,
        actorId: user.id,
        type: "article",
        title: isPublished
          ? "Your article has been published"
          : "Your article has been scheduled",
        message: isPublished
          ? `"${data.title}" has been published.`
          : `"${data.title}" has been scheduled for publication.`,
        actionUrl: "/dashboard/articles",
        metadata: {
          event: isPublished ? "article_published" : "article_scheduled",
          articleId: data.id,
          articleTitle: data.title,
          status: data.status,
          publishedAt: data.published_at,
          scheduledAt: data.scheduled_at,
        },
        dedupeKey: `article:${data.id}:${data.status}:${data.updated_at}`,
      });
    }

    return successResponse(data, 201, "Article created successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}
