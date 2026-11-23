import { z } from "zod";

export const mediaStatuses = ["staged", "published", "archived"];

export const mediaMetadataSchema = z.object({
  altText: z
    .string()
    .trim()
    .max(500, "Alternative text cannot exceed 500 characters.")
    .default(""),
  caption: z
    .string()
    .trim()
    .max(1000, "Caption cannot exceed 1,000 characters.")
    .default(""),
});

export const mediaMetadataUpdateSchema = z
  .object({
    altText: z
      .string()
      .trim()
      .max(500, "Alternative text cannot exceed 500 characters.")
      .optional(),
    caption: z
      .string()
      .trim()
      .max(1000, "Caption cannot exceed 1,000 characters.")
      .optional(),
  })
  .strict()
  .refine(
    (data) => data.altText !== undefined || data.caption !== undefined,
    "Provide at least one metadata field to update.",
  );

export const mediaListFiltersSchema = z.object({
  status: z.enum(mediaStatuses).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
