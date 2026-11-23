import { z } from "zod";

export const userRoleSchema = z.enum(["user", "author", "editor", "admin"]);

export const userDirectoryFiltersSchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    role: userRoleSchema.optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().trim().min(1).max(512).optional(),
  })
  .strict();

export const updateUserRoleSchema = z
  .object({
    role: userRoleSchema,
  })
  .strict();

export const userIdSchema = z.string().uuid("The user identifier is invalid.");

export const userCursorSchema = z
  .object({
    createdAt: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
  })
  .strict();
