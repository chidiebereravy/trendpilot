import { dashboardCommentFiltersSchema } from "@/features/comments/schemas/comment.schema";
import {
  applyCommentCursor,
  buildCommentPage,
  decodeCommentCursor,
} from "@/features/comments/utils/comment-pagination";
import { handleApiError, successResponse } from "@/lib/api/response";
import { AuthError, requireRole } from "@/lib/auth/session";

const COMMENT_FIELDS = `
  id,
  article_id,
  author_id,
  author_display_name,
  parent_id,
  root_id,
  depth,
  content,
  created_at,
  updated_at,
  deleted_at,
  deleted_by,
  article:articles!inner (
    id,
    title,
    slug,
    author_id
  )
`;

function serializeComment(comment) {
  const isDeleted = Boolean(comment.deleted_at);

  return {
    id: comment.id,
    articleId: comment.article_id,
    article: comment.article,
    authorId: comment.author_id,
    authorDisplayName: comment.author_display_name,
    parentId: comment.parent_id,
    rootId: comment.root_id,
    depth: comment.depth,
    content: isDeleted ? null : comment.content,
    isDeleted,
    deletedAt: comment.deleted_at,
    deletedBy: comment.deleted_by,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
  };
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

    const filterResult = dashboardCommentFiltersSchema.safeParse(rawFilters);

    if (!filterResult.success) {
      throw filterResult.error;
    }

    const filters = filterResult.data;
    const isAuthor = profile.role === "author";

    const cursor = decodeCommentCursor(filters.cursor);

    if (filters.cursor && !cursor) {
      throw new AuthError(
        "The comment pagination cursor is invalid.",
        400,
        "INVALID_COMMENT_CURSOR",
      );
    }

    let query = supabase
      .from("comments")
      .select(COMMENT_FIELDS)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    // Authors can only see discussions on their own articles.
    if (isAuthor) {
      query = query.eq("article.author_id", user.id);
    }

    if (filters.articleId) {
      query = query.eq("article_id", filters.articleId);
    }

    if (!filters.includeDeleted) {
      query = query.is("deleted_at", null);
    }

    if (filters.search) {
      const escapedSearch = filters.search.replace(/[\\%_]/g, "\\$&");

      query = query.ilike("content", `%${escapedSearch}%`);
    }

    query = applyCommentCursor(query, cursor, "backward");

    const { data, error } = await query.limit(filters.limit + 1);

    if (error) {
      throw error;
    }

    const page = buildCommentPage(data ?? [], filters.limit);

    return successResponse({
      items: page.items.map(serializeComment),
      pagination: page.pagination,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
