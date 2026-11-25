import { z } from "zod";

export const articleStatuses = [
  "draft",
  "in_review",
  "scheduled",
  "published",
  "archived",
];

const articleStatusSchema = z.enum(articleStatuses);

const slugSchema = z
  .string()
  .trim()
  .min(1, "An article slug is required.")
  .max(180, "The article slug is too long.")
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens only.",
  );

const nullableText = (max, message) =>
  z.string().trim().max(max, message).nullable().optional();

const blockIdSchema = z
  .string()
  .uuid("The content block ID must be a valid UUID.")
  .optional();

const paragraphBlockSchema = z.object({
  type: z.literal("paragraph"),
  id: blockIdSchema,
  text: z.string().max(50000),
});

const headingBlockSchema = z.object({
  type: z.literal("heading"),
  id: blockIdSchema,
  level: z.enum(["h2", "h3"]),
  text: z.string().min(1).max(1000),
});

const quoteBlockSchema = z.object({
  type: z.literal("quote"),
  id: blockIdSchema,
  text: z.string().max(10000),
});

const listBlockSchema = z.object({
  type: z.literal("list"),
  id: blockIdSchema,
  style: z.enum(["bullet", "number"]),
  items: z.array(z.string().max(5000)).min(1).max(100),
});

const articleBlockSchema = z.discriminatedUnion("type", [
  paragraphBlockSchema,
  headingBlockSchema,
  quoteBlockSchema,
  listBlockSchema,
]);

export const articleDocumentSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(articleBlockSchema).max(5000),
  })
  .strict()
  .superRefine((document, context) => {
    const serialized = JSON.stringify(document);

    if (serialized.length > 1_000_000) {
      context.addIssue({
        code: "custom",
        message: "Article content must not exceed 1 MB.",
      });
    }
  });

const articleFields = {
  title: z
    .string()
    .trim()
    .min(1, "An article title is required.")
    .max(200, "The article title must not exceed 200 characters."),

  slug: slugSchema.optional(),

  excerpt: nullableText(
    320,
    "The article excerpt must not exceed 320 characters.",
  ),

  content: articleDocumentSchema,

  categoryId: z.string().uuid("Select a valid Micro Niche."),

  authorId: z.string().uuid("Select a valid author.").optional(),

  status: articleStatusSchema,

  featuredImagePath: z
    .string()
    .trim()
    .max(1024, "The featured image path is too long.")
    .nullable()
    .optional(),

  seoTitle: nullableText(70, "The SEO title must not exceed 70 characters."),

  seoDescription: nullableText(
    170,
    "The SEO description must not exceed 170 characters.",
  ),

  focusKeyword: nullableText(
    100,
    "The focus keyword must not exceed 100 characters.",
  ),

  canonicalUrl: z
    .string()
    .trim()
    .max(2048, "The canonical URL is too long.")
    .regex(
      /^https?:\/\/\S+$/i,
      "The canonical URL must be a valid HTTP or HTTPS URL.",
    )
    .superRefine((value, context) => {
      try {
        const url = new URL(value);

        if (
          !["http:", "https:"].includes(url.protocol) ||
          !url.hostname ||
          url.username ||
          url.password
        ) {
          context.addIssue({
            code: "custom",
            message: "Enter a valid HTTP or HTTPS canonical URL.",
          });
        }
      } catch {
        context.addIssue({
          code: "custom",
          message: "Enter a valid absolute canonical URL.",
        });
      }
    })
    .nullable()
    .optional(),

  noIndex: z.boolean(),

  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
};

export const createArticleSchema = z.object({
  ...articleFields,
  content: articleDocumentSchema.default({
    type: "doc",
    content: [],
  }),
  status: articleStatusSchema.default("draft"),
  noIndex: z.boolean().default(false),
});

export const updateArticleSchema = z
  .object({
    title: articleFields.title.optional(),
    slug: articleFields.slug,
    excerpt: articleFields.excerpt,
    content: articleFields.content.optional(),
    categoryId: articleFields.categoryId.optional(),
    authorId: articleFields.authorId,
    status: articleStatusSchema.optional(),
    featuredImagePath: articleFields.featuredImagePath,
    seoTitle: articleFields.seoTitle,
    seoDescription: articleFields.seoDescription,
    focusKeyword: articleFields.focusKeyword,
    canonicalUrl: articleFields.canonicalUrl,
    noIndex: articleFields.noIndex.optional(),
    scheduledAt: articleFields.scheduledAt,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one article field to update.",
  });

export const articleIdSchema = z
  .string()
  .uuid("The article identifier is invalid.");

export const articleListFiltersSchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: articleStatusSchema.optional(),
  categoryId: z.string().uuid("The category identifier is invalid.").optional(),
  authorId: z.string().uuid("The author identifier is invalid.").optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  sort: z
    .enum(["created_at", "updated_at", "published_at"])
    .default("updated_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
