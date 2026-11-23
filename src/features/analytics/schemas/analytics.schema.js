import { z } from "zod";

export const analyticsRangeSchema = z.enum(["7d", "30d", "90d", "all"]);

export const analyticsQuerySchema = z.object({
  range: analyticsRangeSchema.default("30d"),
});
