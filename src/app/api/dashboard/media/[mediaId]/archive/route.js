import { z } from "zod";

import { requireRole, AuthError } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/api/request";
import {
  errorResponse,
  handleApiError,
  successResponse,
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

function isValidObjectPath(asset) {
  return (
    typeof asset.object_path === "string" &&
    asset.object_path.startsWith(`${asset.owner_id}/`) &&
    !asset.object_path.includes("\\") &&
    !asset.object_path
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..")
  );
}

async function removeObject(bucket, path) {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.storage.from(bucket).remove([path]);

    if (error) {
      console.error("Media archive storage cleanup failed:", {
        bucket,
        path,
        message: error.message,
      });

      return false;
    }

    return true;
  } catch (error) {
    console.error("Media archive storage cleanup threw:", {
      bucket,
      path,
      message: error.message,
    });

    return false;
  }
}

async function restorePublishedAsset({ supabase, mediaId, userId }) {
  const { data, error } = await supabase
    .from("media_assets")
    .update({
      status: "published",
      bucket_id: PUBLIC_BUCKET,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", mediaId)
    .eq("status", "archived")
    .eq("bucket_id", PUBLIC_BUCKET)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Media archive recovery failed:", {
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
      console.error("Media archive lookup failed:", {
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

    if (asset.status === "archived") {
      return errorResponse(
        "This media asset is already archived.",
        409,
        "MEDIA_ALREADY_ARCHIVED",
      );
    }

    if (
      !isValidObjectPath(asset) ||
      ![STAGING_BUCKET, PUBLIC_BUCKET].includes(asset.bucket_id)
    ) {
      throw new AuthError(
        "The media storage path or bucket is invalid.",
        422,
        "INVALID_MEDIA_STORAGE_LOCATION",
      );
    }

    const expectedBucket =
      asset.status === "staged" ? STAGING_BUCKET : PUBLIC_BUCKET;

    if (asset.bucket_id !== expectedBucket) {
      throw new AuthError(
        "The media record has an inconsistent storage state.",
        409,
        "MEDIA_STORAGE_STATE_INVALID",
      );
    }

    // Archive in the database first. The database trigger rejects
    // archiving while the asset is still referenced by an article.
    // This also prevents new article usages from being created.
    const { data: archivedAsset, error: archiveError } = await supabase
      .from("media_assets")
      .update({
        status: "archived",
      })
      .eq("id", mediaId)
      .eq("status", asset.status)
      .eq("bucket_id", asset.bucket_id)
      .select(mediaFields)
      .maybeSingle();

    if (archiveError) {
      console.error("Media archive database update failed:", {
        mediaId,
        code: archiveError.code,
        message: archiveError.message,
      });

      if (archiveError.code === "23514") {
        if (archiveError.message?.includes("site logo or favicon")) {
          return errorResponse(
            "This image is currently used as the site logo or favicon. Select a replacement in General Settings before archiving it.",
            409,
            "BRANDING_MEDIA_IN_USE",
          );
        }

        if (archiveError.message?.includes("advertisement campaign")) {
          return errorResponse(
            "This image is currently used by an advertisement campaign. Select a replacement creative in the campaign settings before archiving it.",
            409,
            "ADVERTISING_MEDIA_IN_USE",
          );
        }

        return errorResponse(
          "This image is still being used by an article. Remove its article references before archiving it.",
          409,
          "MEDIA_IN_USE",
        );
      }

      if (archiveError.code === "42501") {
        return errorResponse(
          "You do not have permission to archive this media.",
          403,
          "MEDIA_PERMISSION_DENIED",
        );
      }

      throw new AuthError(
        "Unable to archive the media record.",
        500,
        "MEDIA_ARCHIVE_FAILED",
      );
    }

    if (!archivedAsset) {
      return errorResponse(
        "The media status changed before this request could be completed. Refresh and try again.",
        409,
        "MEDIA_ARCHIVE_CONFLICT",
      );
    }

    // Staged media is already private. No bucket migration is needed.
    if (asset.bucket_id === STAGING_BUCKET) {
      const cleanupSucceeded = await removeObject(
        STAGING_BUCKET,
        asset.object_path,
      );

      return successResponse(
        {
          media: archivedAsset,
          storageCleanupSucceeded: cleanupSucceeded,
        },
        200,
        cleanupSucceeded
          ? "Media archived successfully."
          : "Media archived, but its private storage object could not be removed. Administrative cleanup is required.",
      );
    }

    // Published media must be copied to private storage before
    // the public object is removed.
    const admin = createSupabaseAdminClient();

    let copyError = null;

    try {
      const result = await admin.storage
        .from(PUBLIC_BUCKET)
        .copy(asset.object_path, asset.object_path, {
          destinationBucket: STAGING_BUCKET,
        });

      copyError = result.error;
    } catch (error) {
      copyError = error;
    }

    if (copyError) {
      console.error("Media archive private copy failed:", {
        mediaId,
        message: copyError.message,
      });

      const restored = await restorePublishedAsset({
        supabase,
        mediaId,
        userId: user.id,
      });

      if (!restored) {
        throw new AuthError(
          "The private copy failed and the database state could not be restored. The asset requires administrative inspection.",
          500,
          "MEDIA_ARCHIVE_RECOVERY_FAILED",
        );
      }

      return errorResponse(
        "The image could not be moved into private storage. Its published status has been restored.",
        502,
        "MEDIA_ARCHIVE_COPY_FAILED",
      );
    }

    // Remove public access only after the private copy exists.
    const publicRemovalSucceeded = await removeObject(
      PUBLIC_BUCKET,
      asset.object_path,
    );

    if (!publicRemovalSucceeded) {
      const restored = await restorePublishedAsset({
        supabase,
        mediaId,
        userId: user.id,
      });

      const privateCleanupSucceeded = await removeObject(
        STAGING_BUCKET,
        asset.object_path,
      );

      if (!restored) {
        throw new AuthError(
          "The public object could not be removed and the database state could not be restored. Immediate administrative inspection is required.",
          500,
          "MEDIA_ARCHIVE_RECOVERY_FAILED",
        );
      }

      if (!privateCleanupSucceeded) {
        console.warn(
          "Duplicate private media object remains after archive recovery:",
          {
            mediaId,
            objectPath: asset.object_path,
          },
        );
      }

      return errorResponse(
        "The public image could not be removed. Its published status has been restored.",
        502,
        "MEDIA_PUBLIC_REMOVAL_FAILED",
      );
    }

    // The public object is gone. Keep the archived record pointing
    // to the private bucket so its storage location remains accurate.
    const { data: finalAsset, error: finalizeError } = await supabase
      .from("media_assets")
      .update({
        bucket_id: STAGING_BUCKET,
      })
      .eq("id", mediaId)
      .eq("status", "archived")
      .eq("bucket_id", PUBLIC_BUCKET)
      .select(mediaFields)
      .maybeSingle();

    if (finalizeError || !finalAsset) {
      console.error("Media archive finalization failed:", {
        mediaId,
        message: finalizeError?.message,
      });

      throw new AuthError(
        "The public image was removed, but the archived media record could not be finalized. Administrative repair is required.",
        500,
        "MEDIA_ARCHIVE_FINALIZATION_FAILED",
      );
    }

    return successResponse(
      {
        media: finalAsset,
        storageCleanupSucceeded: true,
      },
      200,
      "Media archived successfully and removed from public storage.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
