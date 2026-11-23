import { z } from "zod";

export const authorRoleSchema = z.enum(["author", "editor", "admin"]);

export const authorDirectoryFiltersSchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    role: authorRoleSchema.optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().trim().min(1).max(512).optional(),
  })
  .strict();

export const authorCursorSchema = z
  .object({
    createdAt: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
  })
  .strict();
