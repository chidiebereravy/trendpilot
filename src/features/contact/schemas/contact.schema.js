import { z } from "zod";

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters.")
    .max(80, "Name must not exceed 80 characters."),

  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(254, "Email address is too long.")
    .toLowerCase(),

  subject: z
    .string()
    .trim()
    .min(3, "Subject must contain at least 3 characters.")
    .max(120, "Subject must not exceed 120 characters."),

  message: z
    .string()
    .trim()
    .min(20, "Message must contain at least 20 characters.")
    .max(5000, "Message must not exceed 5000 characters."),

  // Honeypot: ordinary visitors should leave this field empty.
  website: z.string().max(200).optional().default(""),
});
