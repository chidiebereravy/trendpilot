import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(254, "Email address is too long.")
  .toLowerCase();

const passwordSchema = z
  .string()
  .min(12, "Password must contain at least 12 characters.")
  .max(128, "Password must not exceed 128 characters.");

export const registerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must contain at least 2 characters.")
    .max(80, "Display name must not exceed 80 characters."),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Password is required.")
    .max(128, "Password is too long."),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});
