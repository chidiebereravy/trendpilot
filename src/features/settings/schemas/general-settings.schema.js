import { z } from "zod";

const nullableText = (max, label) =>
  z
    .string()
    .trim()
    .max(max, `${label} cannot exceed ${max} characters.`)
    .nullable();

const nullableEmail = (label) =>
  z
    .string()
    .trim()
    .max(254, `${label} cannot exceed 254 characters.`)
    .email(`Enter a valid ${label.toLowerCase()}.`)
    .nullable();

const nullableHttpsUrl = (label) =>
  z
    .string()
    .trim()
    .max(2048, `${label} cannot exceed 2,048 characters.`)
    .url(`Enter a valid ${label.toLowerCase()}.`)
    .refine((value) => value.startsWith("https://"), {
      message: `${label} must use HTTPS.`,
    })
    .nullable();

export const updateGeneralSettingsSchema = z
  .object({
    tagline: z.string().trim().min(1).max(160).optional(),

    logoMediaAssetId: z.string().uuid().nullable().optional(),
    faviconMediaAssetId: z.string().uuid().nullable().optional(),

    publicEmail: nullableEmail("Public email").optional(),
    supportEmail: nullableEmail("Support email").optional(),

    contactPhone: nullableText(40, "Contact phone").optional(),
    contactAddress: nullableText(500, "Contact address").optional(),

    facebookUrl: nullableHttpsUrl("Facebook URL").optional(),
    instagramUrl: nullableHttpsUrl("Instagram URL").optional(),
    xUrl: nullableHttpsUrl("X URL").optional(),
    youtubeUrl: nullableHttpsUrl("YouTube URL").optional(),
    linkedinUrl: nullableHttpsUrl("LinkedIn URL").optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one general setting to update.",
  });
