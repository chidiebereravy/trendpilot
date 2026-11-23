import { z } from "zod";

export const affiliateProgramTypes = ["affiliate_network", "direct_merchant"];

export const affiliateProgramStatuses = [
  "draft",
  "pending_review",
  "active",
  "paused",
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
  }, "Only HTTPS URLs are allowed.");

const optionalHttpsUrlSchema = httpsUrlSchema.nullable().optional();

export const createAffiliateProgramSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(200)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    program_type: z.enum(affiliateProgramTypes),
    network_name: z.string().trim().max(200).nullable().optional(),
    website_url: optionalHttpsUrlSchema,
    terms_url: optionalHttpsUrlSchema,
    commission_model: z
      .enum(["percentage", "fixed", "hybrid", "unknown"])
      .default("unknown"),
    default_currency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/)
      .default("USD"),
    status: z.enum(affiliateProgramStatuses).default("draft"),
    notes: z.string().trim().max(5000).nullable().optional(),
  })
  .strict();

export const updateAffiliateProgramSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(200)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      .optional(),
    program_type: z.enum(affiliateProgramTypes).optional(),
    network_name: z.string().trim().max(200).nullable().optional(),
    website_url: optionalHttpsUrlSchema,
    terms_url: optionalHttpsUrlSchema,
    commission_model: z
      .enum(["percentage", "fixed", "hybrid", "unknown"])
      .optional(),
    default_currency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    status: z.enum(affiliateProgramStatuses).optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

export const affiliateProgramFiltersSchema = z.object({
  status: z.enum(affiliateProgramStatuses).optional(),
  programType: z.enum(affiliateProgramTypes).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
