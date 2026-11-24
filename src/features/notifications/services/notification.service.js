import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const NOTIFICATION_TYPES = new Set([
  "system",
  "article",
  "comment",
  "moderation",
  "account",
  "security",
  "announcement",
]);

const NOTIFIABLE_ROLES = new Set(["editor", "admin"]);

function isValidActionUrl(value) {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 2048 &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
  );
}

function validateNotification(notification) {
  if (!notification || typeof notification !== "object") {
    return false;
  }

  const {
    userId,
    actorId,
    type,
    title,
    message,
    actionUrl,
    metadata,
    dedupeKey,
  } = notification;

  if (
    typeof userId !== "string" ||
    !userId.trim() ||
    (actorId !== undefined &&
      actorId !== null &&
      (typeof actorId !== "string" || !actorId.trim())) ||
    actorId === userId ||
    !NOTIFICATION_TYPES.has(type) ||
    typeof title !== "string" ||
    title.trim().length < 1 ||
    title.trim().length > 160 ||
    typeof message !== "string" ||
    message.trim().length < 1 ||
    message.trim().length > 2000
  ) {
    return false;
  }

  if (
    actionUrl !== undefined &&
    actionUrl !== null &&
    !isValidActionUrl(actionUrl)
  ) {
    return false;
  }

  if (
    metadata !== undefined &&
    (metadata === null ||
      typeof metadata !== "object" ||
      Array.isArray(metadata))
  ) {
    return false;
  }

  if (
    dedupeKey !== undefined &&
    dedupeKey !== null &&
    (typeof dedupeKey !== "string" ||
      dedupeKey.trim().length < 1 ||
      dedupeKey.length > 200)
  ) {
    return false;
  }

  return true;
}

export async function createNotificationSafely(notification) {
  if (!validateNotification(notification)) {
    console.error("[notifications] Invalid notification payload.");
    return { created: false, reason: "invalid_payload" };
  }

  try {
    const supabase = createSupabaseAdminClient();

    const {
      userId,
      actorId = null,
      type,
      title,
      message,
      actionUrl = null,
      metadata = {},
      dedupeKey = null,
    } = notification;

    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      actor_id: actorId,
      type,
      title: title.trim(),
      message: message.trim(),
      action_url: actionUrl,
      metadata,
      dedupe_key: dedupeKey,
    });

    if (error) {
      if (error.code === "23505") {
        return { created: false, reason: "duplicate" };
      }

      console.error("[notifications] Creation failed:", error.message);
      return { created: false, reason: "database_error" };
    }

    return { created: true };
  } catch (error) {
    console.error(
      "[notifications] Unexpected creation error:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return { created: false, reason: "unexpected_error" };
  }
}

export async function createNotificationsForRolesSafely({
  roles,
  ...notification
}) {
  if (
    !Array.isArray(roles) ||
    roles.length === 0 ||
    roles.some((role) => !NOTIFIABLE_ROLES.has(role))
  ) {
    console.error("[notifications] Invalid recipient roles.");
    return { created: 0, reason: "invalid_roles" };
  }

  try {
    const supabase = createSupabaseAdminClient();

    const { data: recipients, error } = await supabase
      .from("profiles")
      .select("id")
      .in("role", [...new Set(roles)]);

    if (error) {
      console.error("[notifications] Recipient lookup failed:", error.message);
      return { created: 0, reason: "recipient_lookup_failed" };
    }

    const recipientIds = (recipients ?? [])
      .map((recipient) => recipient.id)
      .filter((id) => id !== notification.actorId);

    const results = await Promise.all(
      recipientIds.map((userId) =>
        createNotificationSafely({
          ...notification,
          userId,
        }),
      ),
    );

    return {
      created: results.filter((result) => result.created).length,
      attempted: recipientIds.length,
    };
  } catch (error) {
    console.error(
      "[notifications] Role notification failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return { created: 0, reason: "unexpected_error" };
  }
}
