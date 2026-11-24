import { z } from "zod";

export const notificationIdSchema = z
  .string()
  .uuid("The notification identifier is invalid.");

export const notificationCursorSchema = z
  .object({
    createdAt: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
  })
  .strict();

export const notificationFiltersSchema = z
  .object({
    status: z.enum(["all", "unread", "read"]).default("all"),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().trim().min(1).max(512).optional(),
  })
  .strict();

export const updateNotificationSchema = z
  .object({
    read: z.boolean(),
  })
  .strict();
