import { z } from "zod";

export const newsletterUnsubscribeSchema = z.object({
  token: z
    .string()
    .length(43)
    .regex(/^[A-Za-z0-9_-]{43}$/, "Invalid unsubscribe token."),
});
