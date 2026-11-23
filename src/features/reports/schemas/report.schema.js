import { z } from "zod";

export const reportTypes = ["articles", "users", "discussions", "categories"];

export const reportTypeSchema = z.enum(reportTypes);

export const reportFiltersSchema = z
  .object({
    type: reportTypeSchema,
    search: z.string().trim().max(100).optional(),

    status: z
      .enum([
        "draft",
        "in_review",
        "scheduled",
        "published",
        "archived",
        "deleted",
      ])
      .optional(),

    role: z.enum(["user", "author", "editor", "admin"]).optional(),

    level: z.enum(["broad", "subcategory", "micro"]).optional(),

    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),

    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),

    includeDeleted: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),

    limit: z.coerce.number().int().min(1).max(50).default(25),

    cursor: z.string().trim().min(1).max(512).optional(),

    format: z.enum(["json", "csv"]).default("json"),
  })
  .strict()
  .superRefine((filters, context) => {
    if (
      filters.dateFrom &&
      filters.dateTo &&
      filters.dateFrom > filters.dateTo
    ) {
      context.addIssue({
        code: "custom",
        path: ["dateTo"],
        message: "The end date must not be earlier than the start date.",
      });
    }

    if (
      filters.type !== "articles" &&
      filters.status &&
      !(filters.type === "discussions" && filters.status === "deleted") &&
      !(
        filters.type === "categories" &&
        ["draft", "published", "archived"].includes(filters.status)
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "This status filter is not available for the selected report.",
      });
    }

    if (filters.type !== "users" && filters.role) {
      context.addIssue({
        code: "custom",
        path: ["role"],
        message: "Role filtering is only available for user reports.",
      });
    }

    if (filters.type !== "categories" && filters.level) {
      context.addIssue({
        code: "custom",
        path: ["level"],
        message:
          "Category level filtering is only available for category reports.",
      });
    }

    if (filters.type !== "discussions" && filters.includeDeleted) {
      context.addIssue({
        code: "custom",
        path: ["includeDeleted"],
        message:
          "Deleted-record filtering is only available for discussion reports.",
      });
    }
  });

export const reportCursorSchema = z
  .object({
    createdAt: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
  })
  .strict();
