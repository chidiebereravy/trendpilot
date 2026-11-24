import { notificationCursorSchema } from "@/features/notifications/schemas/notification.schema";

export function encodeNotificationCursor(notification) {
  const payload = {
    createdAt: notification.created_at,
    id: notification.id,
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeNotificationCursor(cursor) {
  if (!cursor) return null;

  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);
    const result = notificationCursorSchema.safeParse(parsed);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function applyNotificationCursor(query, cursor) {
  if (!cursor) return query;

  return query.or(
    `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
  );
}

export function buildNotificationPage(rows, limit) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items,
    pagination: {
      hasMore,
      nextCursor:
        hasMore && items.length
          ? encodeNotificationCursor(items[items.length - 1])
          : null,
    },
  };
}
