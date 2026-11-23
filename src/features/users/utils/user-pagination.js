import { userCursorSchema } from "@/features/users/schemas/user.schema";

export function encodeUserCursor(user) {
  const cursor = {
    createdAt: user.registered_at,
    id: user.user_id,
  };

  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeUserCursor(value) {
  if (!value) return null;

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);
    const result = userCursorSchema.safeParse(parsed);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function buildUserPage(rows, limit) {
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  const lastItem = items.at(-1);

  return {
    items,
    pagination: {
      hasMore,
      nextCursor: hasMore && lastItem ? encodeUserCursor(lastItem) : null,
    },
  };
}
