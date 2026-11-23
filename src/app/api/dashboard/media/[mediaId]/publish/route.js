import { z } from "zod";

import { requireRole, AuthError } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/api/request";
import {
  handleApiError,
  successResponse,
  errorResponse,
} from "@/lib/api/response";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const paramsSchema = z.object({
  mediaId: z.string().uuid(),
});

const STAGING_BUCKET = "trendpilot-media-staging";
const PUBLIC_BUCKET = "trendpilot-media";

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

async function removeObject(bucket, path) {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.storage.from(bucket).remove([path]);

    if (error) {
      console.error("Media storage cleanup failed:", {
        bucket,
        path,
        message: error.message,
      });

      return false;
    }

    return true;
  } catch (error) {
    console.error("Media storage cleanup threw an exception:", {
      bucket,
      path,
      message: error.message,
    });

    return false;
  }
}

async function rollbackPublication({ supabase, mediaId, userId, reviewedAt }) {
  const { data, error } = await supabase
    .from("media_assets")
    .update({
      bucket_id: STAGING_BUCKET,
      status: "staged",
      reviewed_by: null,
      reviewed_at: null,
    })
    .eq("id", mediaId)
    .eq("status", "published")
    .eq("bucket_id", PUBLIC_BUCKET)
    .eq("reviewed_by", userId)
    .eq("reviewed_at", reviewedAt)
    .select("id, status, bucket_id")
    .maybeSingle();

  if (error) {
    console.error("Media publication rollback failed:", {
      mediaId,
      message: error.message,
    });

    return false;
  }

  return Boolean(data);
}

export async function POST(request, { params }) {
  try {
    assertSameOrigin(request);

    const parsedParams = paramsSchema.safeParse(await params);

    if (!parsedParams.success) {
      return errorResponse("Invalid media ID.", 400, "INVALID_MEDIA_ID");
    }

    const { mediaId } = parsedParams.data;
    const { supabase, user } = await requireRole(["editor", "admin"]);

    const { data: asset, error: lookupError } = await supabase
      .from("media_assets")
      .select(mediaFields)
      .eq("id", mediaId)
      .maybeSingle();

    if (lookupError) {
      console.error("Media publication lookup failed:", lookupError);

      throw new AuthError(
        "Unable to retrieve the media asset.",
        500,
        "MEDIA_LOOKUP_FAILED",
      );
    }

    if (!asset) {
      return errorResponse("Media asset not found.", 404, "MEDIA_NOT_FOUND");
    }

    if (asset.status !== "staged" || asset.bucket_id !== STAGING_BUCKET) {
      return errorResponse(
        "Only staged media can be published.",
        409,
        "MEDIA_NOT_STAGED",
      );
    }

    if (
      typeof asset.object_path !== "string" ||
      !asset.object_path.startsWith(`${asset.owner_id}/`) ||
      asset.object_path.includes("\\") ||
      asset.object_path
        .split("/")
        .some((segment) => !segment || segment === "." || segment === "..")
    ) {
      throw new AuthError(
        "The media storage path is invalid.",
        422,
        "INVALID_MEDIA_PATH",
      );
    }

    const admin = createSupabaseAdminClient();
    const reviewedAt = new Date().toISOString();

    // Claim publication in the database before exposing the object publicly.
    // The conditional update ensures only one request can claim this asset.
    const { data: publishedAsset, error: updateError } = await supabase
      .from("media_assets")
      .update({
        bucket_id: PUBLIC_BUCKET,
        status: "published",
        reviewed_by: user.id,
        reviewed_at: reviewedAt,
      })
      .eq("id", mediaId)
      .eq("status", "staged")
      .eq("bucket_id", STAGING_BUCKET)
      .select(mediaFields)
      .maybeSingle();

    if (updateError) {
      console.error("Media publication database update failed:", {
        mediaId,
        message: updateError.message,
      });

      throw new AuthError(
        "Unable to approve the media asset for publication.",
        500,
        "MEDIA_PUBLICATION_UPDATE_FAILED",
      );
    }

    if (!publishedAsset) {
      return errorResponse(
        "Another request may already be publishing this asset. Refresh the media library and check its status.",
        409,
        "MEDIA_PUBLICATION_CONFLICT",
      );
    }

    // The database now records approval. Copy the file into public storage.
    let copyError = null;

    try {
      const result = await admin.storage
        .from(STAGING_BUCKET)
        .copy(asset.object_path, asset.object_path, {
          destinationBucket: PUBLIC_BUCKET,
        });

      copyError = result.error;
    } catch (error) {
      copyError = error;
    }

    if (copyError) {
      console.error("Media publication copy failed:", {
        mediaId,
        message: copyError.message,
      });

      // Remove any destination object created by an unsuccessful copy.
      // Never remove the original staging object.
      const publicCleanupSucceeded = await removeObject(
        PUBLIC_BUCKET,
        asset.object_path,
      );

      if (!publicCleanupSucceeded) {
        throw new AuthError(
          "The public storage copy could not be verified or cleaned up. The asset remains marked as published and requires administrative inspection.",
          500,
          "MEDIA_PUBLIC_COPY_CLEANUP_FAILED",
        );
      }

      const rollbackSucceeded = await rollbackPublication({
        supabase,
        mediaId,
        userId: user.id,
        reviewedAt,
      });

      if (!rollbackSucceeded) {
        throw new AuthError(
          "The public copy was cleaned up, but the database publication state could not be rolled back. Please inspect the media record.",
          500,
          "MEDIA_PUBLICATION_ROLLBACK_FAILED",
        );
      }

      return errorResponse(
        "Unable to copy the media asset to public storage. The asset has been returned to staging.",
        502,
        "MEDIA_COPY_FAILED",
      );
    }

    // The public copy succeeded. The staging copy is no longer required.
    // Cleanup failure does not invalidate the successful publication.
    const stagingCleanupSucceeded = await removeObject(
      STAGING_BUCKET,
      asset.object_path,
    );

    if (!stagingCleanupSucceeded) {
      console.warn("Published media still has a staging copy:", {
        mediaId,
        objectPath: asset.object_path,
      });
    }

    return successResponse(
      {
        media: publishedAsset,
        stagingCleanupSucceeded,
      },
      200,
      stagingCleanupSucceeded
        ? "Media published successfully."
        : "Media published successfully, but the staging copy could not be removed.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
