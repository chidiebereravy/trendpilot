import { commentCursorSchema } from "@/features/comments/schemas/comment.schema";

export function encodeCommentCursor(comment) {
  const payload = {
    createdAt: comment.created_at,
    id: comment.id,
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeCommentCursor(cursor) {
  if (!cursor) return null;

  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);
    const result = commentCursorSchema.safeParse(parsed);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function applyCommentCursor(query, cursor, direction) {
  if (!cursor) return query;

  const operator = direction === "forward" ? "gt" : "lt";
  const timestamp = cursor.createdAt;
  const id = cursor.id;

  return query.or(
    `created_at.${operator}.${timestamp},and(created_at.eq.${timestamp},id.${operator}.${id})`,
  );
}

export function buildCommentPage(rows, limit) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items,
    pagination: {
      hasMore,
      nextCursor:
        hasMore && items.length
          ? encodeCommentCursor(items[items.length - 1])
          : null,
    },
  };
}
