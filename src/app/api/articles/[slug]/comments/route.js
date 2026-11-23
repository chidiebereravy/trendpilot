import { requireAuthContext, AuthError } from "@/lib/auth/session";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublishedArticleBySlug } from "@/lib/public-content";
import {
  commentPageQuerySchema,
  createCommentSchema,
} from "@/features/comments/schemas/comment.schema";
import {
  applyCommentCursor,
  buildCommentPage,
  decodeCommentCursor,
} from "@/features/comments/utils/comment-pagination";

const COMMENT_FIELDS =
  "id, article_id, author_id, author_display_name, parent_id, root_id, depth, content, created_at, updated_at, deleted_at";

function serializeComment(comment) {
  const isDeleted = Boolean(comment.deleted_at);

  return {
    id: comment.id,
    articleId: comment.article_id,
    authorId: comment.author_id,
    authorDisplayName: comment.author_display_name,
    parentId: comment.parent_id,
    rootId: comment.root_id,
    depth: comment.depth,
    content: isDeleted ? null : comment.content,
    isDeleted,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
  };
}

function handleCommentDatabaseError(error) {
  if (error.code === "42501") {
    throw new AuthError(
      "You do not have permission to perform this operation.",
      403,
      "COMMENT_PERMISSION_DENIED",
    );
  }

  if (error.code === "23503") {
    throw new AuthError(
      "The selected parent comment is no longer available.",
      409,
      "COMMENT_PARENT_UNAVAILABLE",
    );
  }

  if (error.code === "23514" || error.code === "P0001") {
    throw new AuthError(
      error.message || "The comment does not satisfy the discussion rules.",
      422,
      "COMMENT_RULE_VIOLATION",
    );
  }

  if (error.code === "23502") {
    throw new AuthError(
      "A required comment field is missing.",
      422,
      "COMMENT_REQUIRED_FIELD_MISSING",
    );
  }

  throw error;
}

function readPagination(request) {
  const url = new URL(request.url);
  const result = commentPageQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );

  if (!result.success) {
    throw new AuthError(
      "The comment pagination parameters are invalid.",
      400,
      "INVALID_COMMENT_PAGINATION",
    );
  }

  const cursor = result.data.cursor
    ? decodeCommentCursor(result.data.cursor)
    : null;

  if (result.data.cursor && !cursor) {
    throw new AuthError(
      "The comment pagination cursor is invalid.",
      400,
      "INVALID_COMMENT_CURSOR",
    );
  }

  return { limit: result.data.limit, cursor };
}

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    if (typeof slug !== "string" || !slug.trim()) {
      throw new AuthError(
        "The article slug is invalid.",
        400,
        "INVALID_ARTICLE_SLUG",
      );
    }

    const article = await getPublishedArticleBySlug(slug);

    if (!article) {
      throw new AuthError(
        "The requested article was not found.",
        404,
        "ARTICLE_NOT_FOUND",
      );
    }

    const { limit, cursor } = readPagination(request);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("comments")
      .select(COMMENT_FIELDS)
      .eq("article_id", article.id)
      .is("parent_id", null);

    query = applyCommentCursor(query, cursor, "backward");

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (error) throw error;

    const page = buildCommentPage(data || [], limit);

    return successResponse({
      comments: page.items.map(serializeComment),
      pagination: page.pagination,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request, { params }) {
  try {
    assertSameOrigin(request);

    const { user, supabase } = await requireAuthContext();
    const { slug } = await params;

    if (typeof slug !== "string" || !slug.trim()) {
      throw new AuthError(
        "The article slug is invalid.",
        400,
        "INVALID_ARTICLE_SLUG",
      );
    }

    const article = await getPublishedArticleBySlug(slug);

    if (!article) {
      throw new AuthError(
        "The requested article was not found.",
        404,
        "ARTICLE_NOT_FOUND",
      );
    }

    const body = await readValidatedBody(request, createCommentSchema);
    const parentId = body.parentId ?? null;

    if (parentId) {
      const { data: parent, error: parentError } = await supabase
        .from("comments")
        .select("id, article_id")
        .eq("id", parentId)
        .maybeSingle();

      if (parentError) throw parentError;

      if (!parent || parent.article_id !== article.id) {
        throw new AuthError(
          "The parent comment does not belong to this article.",
          404,
          "COMMENT_PARENT_NOT_FOUND",
        );
      }
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        article_id: article.id,
        author_id: user.id,
        parent_id: parentId,
        content: body.content,
      })
      .select(COMMENT_FIELDS)
      .single();

    if (error) handleCommentDatabaseError(error);

    return successResponse(
      { comment: serializeComment(data) },
      201,
      "Comment published successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
