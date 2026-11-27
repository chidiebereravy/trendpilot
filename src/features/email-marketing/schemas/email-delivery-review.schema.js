import { z } from "zod";

export const emailDeliveryReviewSchema = z
  .object({
    resolutionNote: z
      .string()
      .trim()
      .min(10, "Explain why this delivery is safe to mark as failed.")
      .max(1000),
    confirmNotAccepted: z.literal(true, {
      errorMap: () => ({
        message: "Confirm that Resend did not accept this email.",
      }),
    }),
  })
  .strict();
