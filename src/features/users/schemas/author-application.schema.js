import { z } from "zod";

export const submitAuthorApplicationSchema = z
  .object({
    motivation: z
      .string()
      .trim()
      .min(50, "Please provide at least 50 characters.")
      .max(5000, "Motivation must not exceed 5,000 characters."),
    experience: z
      .string()
      .trim()
      .min(20, "Please provide at least 20 characters.")
      .max(5000, "Experience must not exceed 5,000 characters."),
    portfolioUrl: z
      .string()
      .trim()
      .max(2048, "Portfolio URL is too long.")
      .url("Enter a valid portfolio URL.")
      .refine(
        (value) => /^https?:\/\//i.test(value),
        "Portfolio URL must use HTTP or HTTPS.",
      )
      .optional()
      .or(z.literal("")),
  })
  .strict()
  .transform((value) => ({
    ...value,
    portfolioUrl: value.portfolioUrl || null,
  }));

export const authorApplicationStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "all",
]);

export const authorApplicationFiltersSchema = z
  .object({
    status: authorApplicationStatusSchema.default("pending"),
    search: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export const reviewAuthorApplicationSchema = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    reviewNote: z
      .string()
      .trim()
      .max(2000, "Review note must not exceed 2,000 characters.")
      .optional()
      .or(z.literal("")),
  })
  .strict()
  .transform((value) => ({
    decision: value.decision,
    reviewNote: value.reviewNote || null,
  }));

export const authorApplicationIdSchema = z
  .string()
  .uuid("The application identifier is invalid.");
