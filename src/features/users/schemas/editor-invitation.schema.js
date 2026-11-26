import { z } from "zod";

export const editorInvitationStatusSchema = z.enum([
  "pending",
  "accepted",
  "revoked",
  "expired",
  "all",
]);

export const createEditorInvitationSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .max(320)
      .transform((value) => value.toLowerCase()),
  })
  .strict();

export const editorInvitationFiltersSchema = z
  .object({
    status: editorInvitationStatusSchema.default("pending"),
    search: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export const editorInvitationIdSchema = z
  .string()
  .uuid("The invitation identifier is invalid.");

export const acceptEditorInvitationSchema = z
  .object({
    token: z
      .string()
      .regex(/^[A-Za-z0-9_-]{43}$/, "The invitation token is invalid."),
  })
  .strict();
