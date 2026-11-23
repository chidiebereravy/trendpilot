import { z } from "zod";

const socialImageUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) =>
      /^https:\/\/[^/\s][^\s]*$/.test(value) || /^\/[^/\s][^\s]*$/.test(value),
    "Use an HTTPS image URL or a root-relative image path.",
  )
  .nullable();

export const updateSeoSettingsSchema = z
  .object({
    siteName: z.string().trim().min(1).max(80),
    defaultTitle: z.string().trim().min(1).max(70),
    titleTemplate: z.string().trim().min(1).max(120),
    defaultDescription: z.string().trim().min(1).max(170),
    defaultSocialImageUrl: socialImageUrlSchema,
    searchIndexingEnabled: z.boolean(),
    sitemapEnabled: z.boolean(),
    includeArticles: z.boolean(),
    includeCategories: z.boolean(),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one SEO setting to update.",
  });
