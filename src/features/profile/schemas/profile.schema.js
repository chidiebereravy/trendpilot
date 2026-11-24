import { z } from "zod";

export const updateProfileSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "Display name must contain at least 2 characters.")
      .max(80, "Display name must not exceed 80 characters."),
  })
  .strict();

export const changeProfilePasswordSchema = z
  .object({
    password: z
      .string()
      .min(12, "Password must contain at least 12 characters.")
      .max(128, "Password must not exceed 128 characters."),
    confirmPassword: z.string(),
  })
  .strict()
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
