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

// Legacy article format: keep existing articles compatible.
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

const legacyArticleDocumentSchema = z
  .object({
    type: z.literal("doc"),
    content: z
      .array(
        z.discriminatedUnion("type", [
          paragraphBlockSchema,
          headingBlockSchema,
          quoteBlockSchema,
          listBlockSchema,
        ]),
      )
      .max(5000),
  })
  .strict();

// TipTap marks.
const tiptapMarkSchema = z
  .object({
    type: z.enum(["bold", "italic", "underline", "strike", "code", "link"]),
    attrs: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

// TipTap's recursive document-node structure.
const tiptapNodeTypes = [
  "doc",
  "paragraph",
  "text",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "hardBreak",
  "horizontalRule",
  "image",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
  "faqSection",
];

const tiptapNodeSchema = z.lazy(() =>
  z
    .object({
      type: z.enum(tiptapNodeTypes),
      attrs: z.record(z.string(), z.unknown()).optional(),
      content: z.array(tiptapNodeSchema).max(5000).optional(),
      marks: z.array(tiptapMarkSchema).max(20).optional(),
      text: z.string().max(50000).optional(),
    })
    .strict(),
);

function isSafeLink(value) {
  if (typeof value !== "string" || !value.trim()) return false;

  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }

  try {
    const url = new URL(value);

    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function isSafeObjectPath(value) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 1024 ||
    value.startsWith("/") ||
    value.includes("\\")
  ) {
    return false;
  }

  return value
    .split("/")
    .every((segment) => segment && segment !== "." && segment !== "..");
}

function validateTiptapNode(node, context, state, depth = 0) {
  state.nodeCount += 1;

  if (state.nodeCount > 5000) {
    context.addIssue({
      code: "custom",
      message: "Article content contains too many nodes.",
    });
    return;
  }

  if (depth > 30) {
    context.addIssue({
      code: "custom",
      message: "Article content is nested too deeply.",
    });
    return;
  }

  if (node.type === "text" && typeof node.text !== "string") {
    context.addIssue({
      code: "custom",
      message: "Invalid text node.",
    });
  }

  if (node.type === "heading") {
    const level = node.attrs?.level;

    if (![2, 3].includes(level)) {
      context.addIssue({
        code: "custom",
        message: "Article headings must use level 2 or 3.",
      });
    }
  }

  if (node.type === "image") {
    const attrs = node.attrs ?? {};

    if (
      typeof attrs.mediaId !== "string" ||
      !z.string().uuid().safeParse(attrs.mediaId).success ||
      !isSafeObjectPath(attrs.objectPath)
    ) {
      context.addIssue({
        code: "custom",
        message: "Article images must reference a valid media asset.",
      });
    }

    if (attrs.src !== undefined && attrs.src !== null && attrs.src !== "") {
      context.addIssue({
        code: "custom",
        message:
          "Article images must use permanent media references, not image URLs.",
      });
    }

    if (attrs.alt !== undefined && typeof attrs.alt !== "string") {
      context.addIssue({
        code: "custom",
        message: "Image alternative text must be text.",
      });
    }

    if (attrs.caption !== undefined && typeof attrs.caption !== "string") {
      context.addIssue({
        code: "custom",
        message: "Image captions must be text.",
      });
    }
  }

  if (node.type === "faqSection") {
    const items = node.attrs?.items;

    if (!Array.isArray(items) || items.length > 30) {
      context.addIssue({
        code: "custom",
        message: "An FAQ section must contain no more than 30 questions.",
      });
    } else {
      items.forEach((item) => {
        if (
          !item ||
          typeof item.question !== "string" ||
          !item.question.trim() ||
          item.question.length > 500 ||
          typeof item.answer !== "string" ||
          !item.answer.trim() ||
          item.answer.length > 5000
        ) {
          context.addIssue({
            code: "custom",
            message: "Each FAQ needs a valid question and answer.",
          });
        }
      });
    }
  }

  for (const mark of node.marks ?? []) {
    if (mark.type === "link" && !isSafeLink(mark.attrs?.href)) {
      context.addIssue({
        code: "custom",
        message:
          "Article links must use a safe HTTP, HTTPS, mailto or relative URL.",
      });
    }
  }

  for (const child of node.content ?? []) {
    validateTiptapNode(child, context, state, depth + 1);
  }
}

const tiptapArticleDocumentSchema = z
  .object({
    type: z.literal("doc"),
    version: z.literal(2),
    content: z.array(tiptapNodeSchema).max(5000),
  })
  .strict()
  .superRefine((document, context) => {
    const state = { nodeCount: 0 };

    for (const node of document.content) {
      validateTiptapNode(node, context, state, 1);
    }

    const serialized = JSON.stringify(document);

    if (serialized.length > 1_000_000) {
      context.addIssue({
        code: "custom",
        message: "Article content must not exceed 1 MB.",
      });
    }
  });

export const articleDocumentSchema = z.union([
  legacyArticleDocumentSchema,
  tiptapArticleDocumentSchema,
]);

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
