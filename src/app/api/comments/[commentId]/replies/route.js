import { AuthError } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  commentIdSchema,
  commentPageQuerySchema,
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

export async function GET(request, { params }) {
  try {
    const { commentId } = await params;
    const idResult = commentIdSchema.safeParse(commentId);

    if (!idResult.success) {
      throw new AuthError(
        "The comment identifier is invalid.",
        400,
        "INVALID_COMMENT_ID",
      );
    }

    const url = new URL(request.url);
    const pageResult = commentPageQuerySchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );

    if (!pageResult.success) {
      throw new AuthError(
        "The reply pagination parameters are invalid.",
        400,
        "INVALID_REPLY_PAGINATION",
      );
    }

    const cursor = pageResult.data.cursor
      ? decodeCommentCursor(pageResult.data.cursor)
      : null;

    if (pageResult.data.cursor && !cursor) {
      throw new AuthError(
        "The reply pagination cursor is invalid.",
        400,
        "INVALID_REPLY_CURSOR",
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data: parent, error: parentError } = await supabase
      .from("comments")
      .select("id, article_id")
      .eq("id", commentId)
      .maybeSingle();

    if (parentError) throw parentError;

    if (!parent) {
      throw new AuthError(
        "The requested comment was not found.",
        404,
        "COMMENT_NOT_FOUND",
      );
    }

    let query = supabase
      .from("comments")
      .select(COMMENT_FIELDS)
      .eq("article_id", parent.article_id)
      .eq("parent_id", commentId);

    query = applyCommentCursor(query, cursor, "forward");

    const { data, error } = await query
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(pageResult.data.limit + 1);

    if (error) throw error;

    const page = buildCommentPage(data || [], pageResult.data.limit);

    return successResponse({
      replies: page.items.map(serializeComment),
      pagination: page.pagination,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
