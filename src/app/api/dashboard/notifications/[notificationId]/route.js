import {
  notificationIdSchema,
  updateNotificationSchema,
} from "@/features/notifications/schemas/notification.schema";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";
import { AuthError, requireAuthContext } from "@/lib/auth/session";

async function getNotificationId(params) {
  const { notificationId } = await params;
  const result = notificationIdSchema.safeParse(notificationId);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}

export async function PATCH(request, { params }) {
  try {
    assertSameOrigin(request);

    const { supabase, user } = await requireAuthContext();
    const notificationId = await getNotificationId(params);
    const body = await readValidatedBody(request, updateNotificationSchema);

    const { data, error } = await supabase
      .from("notifications")
      .update({
        read_at: body.read ? new Date().toISOString() : null,
      })
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .select("id, read_at")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new AuthError(
        "The notification could not be found.",
        404,
        "NOTIFICATION_NOT_FOUND",
      );
    }

    return successResponse({
      id: data.id,
      isRead: Boolean(data.read_at),
      readAt: data.read_at,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    assertSameOrigin(request);

    const { supabase, user } = await requireAuthContext();
    const notificationId = await getNotificationId(params);

    const { data, error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new AuthError(
        "The notification could not be found.",
        404,
        "NOTIFICATION_NOT_FOUND",
      );
    }

    return successResponse({
      id: data.id,
      deleted: true,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
