import { requireRole, AuthError } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import {
  articleIdSchema,
  updateArticleSchema,
} from "@/features/articles/schemas/article.schema";

import {
  createNotificationSafely,
  createNotificationsForRolesSafely,
} from "@/features/notifications/services/notification.service";

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

async function getArticle(supabase, articleId) {
  const { data, error } = await supabase
    .from("articles")
    .select(articleFields)
    .eq("id", articleId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new AuthError(
      "The requested article was not found.",
      404,
      "ARTICLE_NOT_FOUND",
    );
  }

  return data;
}

export async function GET(request, { params }) {
  try {
    const { supabase } = await requireRole(["author", "editor", "admin"]);

    const { articleId } = await params;
    const idResult = articleIdSchema.safeParse(articleId);

    if (!idResult.success) {
      throw new AuthError(
        "The article identifier is invalid.",
        400,
        "INVALID_ARTICLE_ID",
      );
    }

    const article = await getArticle(supabase, articleId);

    return successResponse(article);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    assertSameOrigin(request);

    const { supabase, user, profile } = await requireRole([
      "author",
      "editor",
      "admin",
    ]);

    const { articleId } = await params;
    const idResult = articleIdSchema.safeParse(articleId);

    if (!idResult.success) {
      throw new AuthError(
        "The article identifier is invalid.",
        400,
        "INVALID_ARTICLE_ID",
      );
    }

    const body = await readValidatedBody(request, updateArticleSchema);
    const article = await getArticle(supabase, articleId);

    const isAuthor = profile.role === "author";

    if (isAuthor) {
      if (!["draft", "in_review"].includes(article.status)) {
        throw new AuthError(
          "You can only edit articles that are drafts or awaiting review.",
          403,
          "ARTICLE_STATUS_NOT_EDITABLE",
        );
      }
      if (article.author_id !== user.id) {
        throw new AuthError(
          "You can only update your own articles.",
          403,
          "ARTICLE_OWNERSHIP_REQUIRED",
        );
      }

      if (body.authorId !== undefined && body.authorId !== user.id) {
        throw new AuthError(
          "Authors cannot reassign an article to another author.",
          403,
          "ARTICLE_AUTHOR_ASSIGNMENT_FORBIDDEN",
        );
      }

      if (
        body.status !== undefined &&
        !["draft", "in_review"].includes(body.status)
      ) {
        throw new AuthError(
          "Authors can only save articles as drafts or submit them for review.",
          403,
          "ARTICLE_STATUS_FORBIDDEN",
        );
      }
    }

    const updates = {};

    const fieldMap = {
      title: "title",
      slug: "slug",
      excerpt: "excerpt",
      content: "content",
      categoryId: "category_id",
      authorId: "author_id",
      status: "status",
      featuredImagePath: "featured_image_path",
      seoTitle: "seo_title",
      seoDescription: "seo_description",
      focusKeyword: "focus_keyword",
      canonicalUrl: "canonical_url",
      noIndex: "no_index",
      scheduledAt: "scheduled_at",
    };

    for (const [inputField, databaseField] of Object.entries(fieldMap)) {
      if (Object.hasOwn(body, inputField)) {
        updates[databaseField] = body[inputField];
      }
    }

    if (
      !isAuthor &&
      (body.status === "scheduled" ||
        (body.status === undefined && article.status === "scheduled"))
    ) {
      const scheduledAt =
        body.scheduledAt !== undefined
          ? body.scheduledAt
          : article.scheduled_at;

      if (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now()) {
        throw new AuthError(
          "A scheduled article must have a future publication date and time.",
          422,
          "INVALID_SCHEDULED_DATE",
        );
      }
    }

    const { data, error } = await supabase
      .from("articles")
      .update(updates)
      .eq("id", articleId)
      .select(articleFields)
      .single();

    if (error) handleDatabaseError(error);

    // Only notify when the article's status actually changes.
    if (article.status !== data.status) {
      // Author submitted an article for editorial review.
      if (profile.role === "author" && data.status === "in_review") {
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

      // Editor or admin published or scheduled an article.
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
    }

    return successResponse(data, 200, "Article updated successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    assertSameOrigin(request);

    const { supabase } = await requireRole(["editor", "admin"]);

    const { articleId } = await params;
    const idResult = articleIdSchema.safeParse(articleId);

    if (!idResult.success) {
      throw new AuthError(
        "The article identifier is invalid.",
        400,
        "INVALID_ARTICLE_ID",
      );
    }

    await getArticle(supabase, articleId);

    const { error } = await supabase
      .from("articles")
      .delete()
      .eq("id", articleId);

    if (error) handleDatabaseError(error);

    return successResponse(null, 200, "Article deleted successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}
