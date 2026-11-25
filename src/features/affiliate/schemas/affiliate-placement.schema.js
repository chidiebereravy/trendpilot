import { z } from "zod";

const placementItemSchema = z
  .object({
    blockId: z.string().uuid(),
    affiliateLinkId: z.string().uuid(),
  })
  .strict();

export const affiliatePlacementsSchema = z
  .object({
    placements: z.array(placementItemSchema).max(100),
  })
  .strict()
  .superRefine(({ placements }, context) => {
    const blockIds = new Set();

    placements.forEach((placement, index) => {
      if (blockIds.has(placement.blockId)) {
        context.addIssue({
          code: "custom",
          path: ["placements", index, "blockId"],
          message: "An article block can only have one affiliate link.",
        });
      }

      blockIds.add(placement.blockId);
    });
  });
