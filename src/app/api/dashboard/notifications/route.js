import { notificationFiltersSchema } from "@/features/notifications/schemas/notification.schema";
import {
  applyNotificationCursor,
  buildNotificationPage,
  decodeNotificationCursor,
} from "@/features/notifications/utils/notification-pagination";
import { handleApiError, successResponse } from "@/lib/api/response";
import { AuthError, requireAuthContext } from "@/lib/auth/session";

const NOTIFICATION_FIELDS = `
  id,
  actor_id,
  type,
  title,
  message,
  action_url,
  metadata,
  read_at,
  created_at
`;

function serializeNotification(notification) {
  return {
    id: notification.id,
    actorId: notification.actor_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    actionUrl: notification.action_url,
    metadata: notification.metadata,
    isRead: Boolean(notification.read_at),
    readAt: notification.read_at,
    createdAt: notification.created_at,
  };
}

export async function GET(request) {
  try {
    const { supabase, user } = await requireAuthContext();

    const url = new URL(request.url);
    const rawFilters = Object.fromEntries(url.searchParams.entries());

    const filterResult = notificationFiltersSchema.safeParse(rawFilters);

    if (!filterResult.success) {
      throw filterResult.error;
    }

    const filters = filterResult.data;
    const cursor = decodeNotificationCursor(filters.cursor);

    if (filters.cursor && !cursor) {
      throw new AuthError(
        "The notification pagination cursor is invalid.",
        400,
        "INVALID_NOTIFICATION_CURSOR",
      );
    }

    let query = supabase
      .from("notifications")
      .select(NOTIFICATION_FIELDS)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (filters.status === "unread") {
      query = query.is("read_at", null);
    } else if (filters.status === "read") {
      query = query.not("read_at", "is", null);
    }

    query = applyNotificationCursor(query, cursor);

    const unreadCountQuery = supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);

    const [{ data, error }, { count: unreadCount, error: unreadCountError }] =
      await Promise.all([query.limit(filters.limit + 1), unreadCountQuery]);

    if (error) {
      throw error;
    }

    if (unreadCountError) {
      throw unreadCountError;
    }

    const page = buildNotificationPage(data ?? [], filters.limit);

    return successResponse({
      items: page.items.map(serializeNotification),
      pagination: page.pagination,
      unreadCount: unreadCount ?? 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
