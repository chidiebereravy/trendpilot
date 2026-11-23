import { authorCursorSchema } from "@/features/authors/schemas/author.schema";

export function encodeAuthorCursor(author) {
  return Buffer.from(
    JSON.stringify({
      createdAt: author.created_at,
      id: author.id,
    }),
    "utf8",
  ).toString("base64url");
}

export function decodeAuthorCursor(value) {
  if (!value) return null;

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);
    const result = authorCursorSchema.safeParse(parsed);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function buildAuthorPage(rows, limit) {
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  const lastItem = items.at(-1);

  return {
    items,
    pagination: {
      hasMore,
      nextCursor: hasMore && lastItem ? encodeAuthorCursor(lastItem) : null,
    },
  };
}
