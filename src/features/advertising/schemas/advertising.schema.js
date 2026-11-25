import { z } from "zod";

const optionalText = (max) => z.string().trim().max(max).nullable().optional();

const optionalDate = z
  .string()
  .datetime({ offset: true })
  .nullable()
  .optional();

const campaignFields = {
  name: z.string().trim().min(2).max(160),
  campaign_type: z.enum(["network", "direct", "sponsored", "house"]),
  channel: z.enum(["display", "native", "sponsored_content", "email", "other"]),
  objective: optionalText(500),
  headline: optionalText(160),
  description: optionalText(1000),
  image_url: z
    .string()
    .trim()
    .url()
    .max(2048)
    .refine(
      (value) => /^https:\/\//i.test(value),
      "Advertisement image URLs must use HTTPS.",
    )
    .nullable()
    .optional(),
  image_media_asset_id: z.string().uuid().nullable().optional(),
  image_alt_text: optionalText(300),
  call_to_action_text: optionalText(40),
  destination_url: z
    .string()
    .trim()
    .url()
    .max(2048)
    .refine(
      (value) => /^https?:\/\//i.test(value),
      "Destination URLs must use HTTP or HTTPS.",
    )
    .nullable()
    .optional(),
  status: z.enum([
    "draft",
    "pending_review",
    "scheduled",
    "active",
    "paused",
    "completed",
    "rejected",
    "archived",
  ]),
  starts_at: optionalDate,
  ends_at: optionalDate,
  advertiser_id: z.string().uuid().nullable().optional(),
  network_connection_id: z.string().uuid().nullable().optional(),
};

function validateCampaignDates(value, context) {
  if (value.image_media_asset_id && value.image_url) {
    context.addIssue({
      code: "custom",
      path: ["image_media_asset_id"],
      message: "Choose either a Media Library image or an external image URL, not both.",
    });
  }

  if (
    value.starts_at &&
    value.ends_at &&
    new Date(value.ends_at) <= new Date(value.starts_at)
  ) {
    context.addIssue({
      code: "custom",
      path: ["ends_at"],
      message: "The campaign end date must be after its start date.",
    });
  }
}

const campaignPlacementIdsSchema = z
  .array(z.string().uuid())
  .max(50)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "A placement cannot be assigned more than once.",
  });

export const createCampaignSchema = z
  .object({
    ...campaignFields,
    placement_ids: campaignPlacementIdsSchema.optional(),
  })
  .strict()
  .superRefine(validateCampaignDates);

export const updateCampaignSchema = z
  .object({
    ...Object.fromEntries(
      Object.entries(campaignFields).map(([key, value]) => [
        key,
        value.optional(),
      ]),
    ),
    placement_ids: campaignPlacementIdsSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one campaign field to update.",
  })
  .superRefine(validateCampaignDates);

export const campaignFiltersSchema = z.object({
  status: z
    .enum([
      "draft",
      "pending_review",
      "scheduled",
      "active",
      "paused",
      "completed",
      "rejected",
      "archived",
    ])
    .optional(),
  campaignType: z.enum(["network", "direct", "sponsored", "house"]).optional(),
  channel: z
    .enum(["display", "native", "sponsored_content", "email", "other"])
    .optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const createNetworkSchema = z
  .object({
    provider: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(
        /^[a-zA-Z0-9][a-zA-Z0-9 _.-]*$/,
        "Enter a valid advertising network provider.",
      ),
    account_label: z.string().trim().min(2).max(120),
    external_account_id: optionalText(160),
    publisher_id: optionalText(160),
    status: z
      .enum([
        "not_configured",
        "pending",
        "connected",
        "paused",
        "disconnected",
        "error",
      ])
      .default("not_configured"),
    notes: optionalText(2000),
  })
  .strict();

export const updateNetworkSchema = z
  .object({
    provider: createNetworkSchema.shape.provider.optional(),
    account_label: createNetworkSchema.shape.account_label.optional(),
    external_account_id: optionalText(160),
    publisher_id: optionalText(160),
    status: createNetworkSchema.shape.status.optional(),
    notes: optionalText(2000),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one network field to update.",
  });

export const networkFiltersSchema = z.object({
  status: z
    .enum([
      "not_configured",
      "pending",
      "connected",
      "paused",
      "disconnected",
      "error",
    ])
    .optional(),
  search: z.string().trim().max(100).optional(),
});

const advertiserFields = {
  company_name: z.string().trim().min(2).max(180),
  contact_name: optionalText(120),
  contact_email: z.string().trim().email().max(254).nullable().optional(),
  contact_phone: optionalText(40),
  website_url: z
    .string()
    .trim()
    .url()
    .max(2048)
    .refine(
      (value) => /^https?:\/\//i.test(value),
      "Website URLs must use HTTP or HTTPS.",
    )
    .nullable()
    .optional(),
  billing_address: optionalText(1000),
  tax_reference: optionalText(120),
  notes: optionalText(2000),
  status: z.enum(["prospect", "active", "inactive", "blacklisted"]),
};

export const createAdvertiserSchema = z.object(advertiserFields).strict();

export const updateAdvertiserSchema = z
  .object({
    company_name: advertiserFields.company_name.optional(),
    contact_name: advertiserFields.contact_name,
    contact_email: advertiserFields.contact_email,
    contact_phone: advertiserFields.contact_phone,
    website_url: advertiserFields.website_url,
    billing_address: advertiserFields.billing_address,
    tax_reference: advertiserFields.tax_reference,
    notes: advertiserFields.notes,
    status: advertiserFields.status.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one advertiser field to update.",
  });

export const advertiserFiltersSchema = z.object({
  status: z.enum(["prospect", "active", "inactive", "blacklisted"]).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const placementDimensionsSchema = z
  .object({
    width: z.number().int().positive().max(10000).optional(),
    height: z.number().int().positive().max(10000).optional(),
    unit: z.enum(["px"]).default("px"),
    responsive: z.boolean().default(true),
  })
  .strict();

const placementFields = {
  name: z.string().trim().min(2).max(120),
  placement_key: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(
      /^[a-z0-9][a-z0-9_-]{1,79}$/,
      "Use lowercase letters, numbers, underscores, or hyphens.",
    ),
  description: optionalText(1000),
  page_scope: z.enum([
    "sitewide",
    "homepage",
    "article",
    "category",
    "search",
    "other",
  ]),
  position: z.enum([
    "header",
    "sidebar",
    "in_content",
    "article_top",
    "article_bottom",
    "footer",
    "feed",
    "custom",
  ]),
  format: z.enum([
    "responsive",
    "display",
    "native",
    "banner",
    "in_feed",
    "custom",
  ]),
  status: z.enum(["active", "inactive", "archived"]),
  dimensions: placementDimensionsSchema.default({}),
};

export const createPlacementSchema = z.object(placementFields).strict();

export const updatePlacementSchema = z
  .object({
    name: placementFields.name.optional(),
    placement_key: placementFields.placement_key.optional(),
    description: placementFields.description,
    page_scope: placementFields.page_scope.optional(),
    position: placementFields.position.optional(),
    format: placementFields.format.optional(),
    status: placementFields.status.optional(),
    dimensions: placementDimensionsSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one placement field to update.",
  });

export const placementFiltersSchema = z.object({
  status: z.enum(["active", "inactive", "archived"]).optional(),
  pageScope: z
    .enum(["sitewide", "homepage", "article", "category", "search", "other"])
    .optional(),
  position: z
    .enum([
      "header",
      "sidebar",
      "in_content",
      "article_top",
      "article_bottom",
      "footer",
      "feed",
      "custom",
    ])
    .optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

