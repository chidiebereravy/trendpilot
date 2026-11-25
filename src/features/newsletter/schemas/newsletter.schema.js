import { z } from "zod";

export const newsletterSignupSchema = z.object({
  name: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().email().max(254).toLowerCase(),
  consent: z.literal(true, {
    error: () => "Please agree to receive newsletter emails.",
  }),
  website: z.string().max(200).optional().default(""),
});
