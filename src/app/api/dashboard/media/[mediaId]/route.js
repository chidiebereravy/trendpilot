import { z } from "zod";

import { requireRole, AuthError } from "@/lib/auth/session";
import { readValidatedBody, assertSameOrigin } from "@/lib/api/request";
import {
  errorResponse,
  handleApiError,
  successResponse,
} from "@/lib/api/response";
import { mediaMetadataUpdateSchema } from "@/features/media/schemas/media.schema";

const paramsSchema = z.object({
  mediaId: z.string().uuid(),
});

const mediaFields = [
  "id",
  "owner_id",
  "created_by",
  "bucket_id",
  "object_path",
  "original_filename",
  "mime_type",
  "file_size_bytes",
  "width",
  "height",
  "alt_text",
  "caption",
  "status",
  "reviewed_by",
  "reviewed_at",
  "created_at",
  "updated_at",
].join(", ");

export async function PATCH(request, { params }) {
  try {
    assertSameOrigin(request);

    const parsedParams = paramsSchema.safeParse(await params);

    if (!parsedParams.success) {
      return errorResponse("Invalid media ID.", 400, "INVALID_MEDIA_ID");
    }

    const { mediaId } = parsedParams.data;

    const { supabase, user, profile } = await requireRole([
      "author",
      "editor",
      "admin",
    ]);

    const payload = await readValidatedBody(request, mediaMetadataUpdateSchema);

    const { data: asset, error: lookupError } = await supabase
      .from("media_assets")
      .select("id, owner_id, status")
      .eq("id", mediaId)
      .maybeSingle();

    if (lookupError) {
      console.error("Media metadata lookup failed:", {
        mediaId,
        message: lookupError.message,
      });

      throw new AuthError(
        "Unable to retrieve the media asset.",
        500,
        "MEDIA_LOOKUP_FAILED",
      );
    }

    if (!asset) {
      return errorResponse("Media asset not found.", 404, "MEDIA_NOT_FOUND");
    }

    if (profile.role === "author") {
      if (asset.owner_id !== user.id) {
        return errorResponse(
          "You cannot edit another user's media.",
          403,
          "MEDIA_PERMISSION_DENIED",
        );
      }

      if (asset.status !== "staged") {
        return errorResponse(
          "Authors can only edit metadata on their own staged media.",
          403,
          "MEDIA_STATUS_NOT_EDITABLE",
        );
      }
    }

    const updates = {};

    if (payload.altText !== undefined) {
      updates.alt_text = payload.altText;
    }

    if (payload.caption !== undefined) {
      updates.caption = payload.caption;
    }

    const { data: updatedAsset, error: updateError } = await supabase
      .from("media_assets")
      .update(updates)
      .eq("id", mediaId)
      .select(mediaFields)
      .maybeSingle();

    if (updateError) {
      console.error("Media metadata update failed:", {
        mediaId,
        code: updateError.code,
        message: updateError.message,
      });

      if (updateError.code === "42501") {
        throw new AuthError(
          "You do not have permission to update this media asset.",
          403,
          "MEDIA_PERMISSION_DENIED",
        );
      }

      if (updateError.code === "23514") {
        throw new AuthError(
          "The media metadata does not satisfy the database rules.",
          422,
          "MEDIA_VALIDATION_FAILED",
        );
      }

      throw new AuthError(
        "Unable to update the media metadata.",
        500,
        "MEDIA_UPDATE_FAILED",
      );
    }

    if (!updatedAsset) {
      return errorResponse(
        "The media asset could not be updated. Refresh and try again.",
        409,
        "MEDIA_UPDATE_CONFLICT",
      );
    }

    return successResponse(
      updatedAsset,
      200,
      "Media metadata updated successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
