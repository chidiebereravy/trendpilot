import { AuthError, requireAuthContext } from "@/lib/auth/session";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";
import {
  commentIdSchema,
  updateCommentSchema,
} from "@/features/comments/schemas/comment.schema";

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

  if (error.code === "23514" || error.code === "P0001") {
    throw new AuthError(
      error.message || "The comment violates a discussion rule.",
      422,
      "COMMENT_RULE_VIOLATION",
    );
  }

  throw error;
}

async function getCommentId(params) {
  const { commentId } = await params;
  const result = commentIdSchema.safeParse(commentId);

  if (!result.success) {
    throw new AuthError(
      "The comment identifier is invalid.",
      400,
      "INVALID_COMMENT_ID",
    );
  }

  return result.data;
}

export async function PATCH(request, { params }) {
  try {
    assertSameOrigin(request);

    const { supabase } = await requireAuthContext();
    const commentId = await getCommentId(params);
    const body = await readValidatedBody(request, updateCommentSchema);

    const { data, error } = await supabase
      .from("comments")
      .update({ content: body.content })
      .eq("id", commentId)
      .is("deleted_at", null)
      .select(COMMENT_FIELDS)
      .maybeSingle();

    if (error) handleCommentDatabaseError(error);

    if (!data) {
      throw new AuthError(
        "The comment was not found or cannot be edited.",
        404,
        "COMMENT_NOT_FOUND_OR_NOT_EDITABLE",
      );
    }

    return successResponse(
      { comment: serializeComment(data) },
      200,
      "Comment updated successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    assertSameOrigin(request);

    const { supabase } = await requireAuthContext();
    const commentId = await getCommentId(params);

    const { data, error } = await supabase
      .from("comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", commentId)
      .is("deleted_at", null)
      .select(COMMENT_FIELDS)
      .maybeSingle();

    if (error) handleCommentDatabaseError(error);

    if (!data) {
      throw new AuthError(
        "The comment was not found or cannot be deleted.",
        404,
        "COMMENT_NOT_FOUND_OR_NOT_DELETABLE",
      );
    }

    return successResponse(
      { comment: serializeComment(data) },
      200,
      "Comment deleted successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
