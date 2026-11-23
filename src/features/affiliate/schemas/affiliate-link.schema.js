import { z } from "zod";

export const affiliateLinkStatuses = [
  "draft",
  "pending_review",
  "approved",
  "active",
  "paused",
  "expired",
  "archived",
];

const httpsUrlSchema = z
  .string()
  .trim()
  .url("Enter a valid URL.")
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Only HTTPS destinations are allowed.");

const expirySchema = z.string().datetime({ offset: true }).nullable();

export const affiliateLinkFiltersSchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(affiliateLinkStatuses).optional(),
  programId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const createAffiliateLinkSchema = z
  .object({
    programId: z.string().uuid(),
    title: z.string().trim().min(2).max(250),
    description: z.string().trim().max(2000).nullable().optional(),
    destinationUrl: httpsUrlSchema,
    expiresAt: expirySchema.optional(),
    status: z.enum(["draft", "pending_review"]).default("draft"),
  })
  .strict();

export const updateAffiliateLinkSchema = z
  .object({
    programId: z.string().uuid().optional(),
    title: z.string().trim().min(2).max(250).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    destinationUrl: httpsUrlSchema.optional(),
    expiresAt: expirySchema.optional(),
    status: z.enum(affiliateLinkStatuses).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const affiliateLinkIdSchema = z.string().uuid();
