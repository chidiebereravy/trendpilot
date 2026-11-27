import { z } from "zod";

const optionalText = (max) => z.string().trim().max(max).nullable().optional();

const campaignFields = {
  name: z.string().trim().min(2).max(160),
  subject: z.string().trim().min(2).max(200),
  preview_text: optionalText(250),
  from_name: z
    .string()
    .trim()
    .max(100)
    .regex(/^[^<>\r\n]*$/, "Enter a valid sender name.")
    .nullable()
    .optional(),
  reply_to_email: z.string().trim().email().max(254).nullable().optional(),
  html_content: z.string().max(200000).nullable().optional(),
  text_content: z.string().max(100000).nullable().optional(),
};

function validateCampaignContent(value, context) {
  if (!value.html_content?.trim() && !value.text_content?.trim()) {
    context.addIssue({
      code: "custom",
      path: ["html_content"],
      message: "Provide HTML or plain-text email content.",
    });
  }
}

export const createEmailCampaignSchema = z
  .object(campaignFields)
  .strict()
  .superRefine(validateCampaignContent);

export const updateEmailCampaignSchema = z
  .object({
    name: campaignFields.name.optional(),
    subject: campaignFields.subject.optional(),
    preview_text: campaignFields.preview_text,
    from_name: campaignFields.from_name,
    reply_to_email: campaignFields.reply_to_email,
    html_content: campaignFields.html_content,
    text_content: campaignFields.text_content,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one campaign field to update.",
  });

export const emailCampaignFiltersSchema = z.object({
  status: z
    .enum([
      "draft",
      "pending_review",
      "scheduled",
      "sending",
      "sent",
      "paused",
      "needs_review",
      "cancelled",
      "failed",
    ])
    .optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
