import { z } from "zod";

export const emailReportFiltersSchema = z
  .object({
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .superRefine((value, context) => {
    if (value.from && value.to && value.from >= value.to) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "The end date must be after the start date.",
      });
    }
  });
