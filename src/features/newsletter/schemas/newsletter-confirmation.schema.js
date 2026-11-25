import { z } from "zod";

export const newsletterConfirmationSchema = z.object({
  token: z.string().min(1).max(2048),
});
