import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(1, "A category slug is required.")
  .max(100, "Category slug is too long.")
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens only.",
  );

const categoryFields = {
  name: z
    .string()
    .trim()
    .min(2, "Category name must contain at least 2 characters.")
    .max(80, "Category name must not exceed 80 characters."),

  slug: slugSchema.optional(),

  parentId: z.string().uuid("Select a valid parent category."),

  description: z
    .string()
    .trim()
    .max(500, "Description must not exceed 500 characters.")
    .nullable()
    .optional(),

  status: z.enum(["draft", "published", "archived"]).default("draft"),

  seoTitle: z
    .string()
    .trim()
    .max(70, "SEO title must not exceed 70 characters.")
    .nullable()
    .optional(),

  seoDescription: z
    .string()
    .trim()
    .max(170, "SEO description must not exceed 170 characters.")
    .nullable()
    .optional(),

  displayOrder: z.number().int().min(0).max(100000).default(0),
};

export const createCategorySchema = z.object(categoryFields);

export const updateCategorySchema = z
  .object({
    name: categoryFields.name.optional(),
    slug: categoryFields.slug,
    description: categoryFields.description,
    status: z.enum(["draft", "published", "archived"]).optional(),
    seoTitle: categoryFields.seoTitle,
    seoDescription: categoryFields.seoDescription,
    displayOrder: z.number().int().min(0).max(100000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one category field to update.",
  });

export const categoryIdSchema = z
  .string()
  .uuid("The category identifier is invalid.");
