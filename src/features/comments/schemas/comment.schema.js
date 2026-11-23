import { z } from "zod";

export const commentIdSchema = z
  .string()
  .uuid("The comment identifier is invalid.");

export const commentPageQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().trim().min(1).max(512).optional(),
  })
  .strict();

export const createCommentSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Write something before submitting your comment.")
      .max(5000, "A comment cannot exceed 5,000 characters."),
    parentId: z
      .string()
      .uuid("The parent comment identifier is invalid.")
      .nullable()
      .optional(),
  })
  .strict();

export const updateCommentSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "A comment cannot be empty.")
      .max(5000, "A comment cannot exceed 5,000 characters."),
  })
  .strict();

export const commentCursorSchema = z
  .object({
    createdAt: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
  })
  .strict();

export const dashboardCommentFiltersSchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    articleId: z.string().uuid("The article identifier is invalid.").optional(),
    includeDeleted: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().trim().min(1).max(512).optional(),
  })
  .strict();
