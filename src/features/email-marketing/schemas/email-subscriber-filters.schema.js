import { z } from "zod";

export const emailSubscriberFiltersSchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z
    .enum(["pending", "subscribed", "unsubscribed", "suppressed"])
    .optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
