import { z } from "zod";

export const sponsoredContentStatuses = [
  "draft",
  "pending_review",
  "approved",
  "published",
  "paused",
  "archived",
];

const sponsoredContentStatusSchema = z.enum(sponsoredContentStatuses);

const optionalDate = z
  .string()
  .datetime({ offset: true })
  .nullable()
  .optional();

const dateRangeRefinement = (data, context) => {
  if (
    data.starts_at &&
    data.ends_at &&
    new Date(data.ends_at).getTime() <= new Date(data.starts_at).getTime()
  ) {
    context.addIssue({
      code: "custom",
      path: ["ends_at"],
      message: "The end date must be later than the start date.",
    });
  }
};

export const createSponsoredContentSchema = z
  .object({
    campaign_id: z.string().uuid("Select a valid campaign."),
    article_id: z.string().uuid("Select a valid article."),
    disclosure_label: z
      .string()
      .trim()
      .min(1, "A disclosure label is required.")
      .max(80, "The disclosure label must not exceed 80 characters.")
      .default("Sponsored"),
    status: z.enum(["draft", "pending_review"]).default("draft"),
    starts_at: optionalDate,
    ends_at: optionalDate,
  })
  .strict()
  .superRefine(dateRangeRefinement);

export const updateSponsoredContentSchema = z
  .object({
    campaign_id: z.string().uuid("Select a valid campaign.").optional(),
    article_id: z.string().uuid("Select a valid article.").optional(),
    disclosure_label: z.string().trim().min(1).max(80).optional(),
    status: sponsoredContentStatusSchema.optional(),
    starts_at: optionalDate,
    ends_at: optionalDate,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  })
  .superRefine(dateRangeRefinement);

export const sponsoredContentFiltersSchema = z.object({
  status: sponsoredContentStatusSchema.optional(),
  campaignId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
