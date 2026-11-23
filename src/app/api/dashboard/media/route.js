import { randomUUID } from "node:crypto";

import { requireRole, AuthError } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin } from "@/lib/api/request";
import {
  mediaListFiltersSchema,
  mediaMetadataSchema,
} from "@/features/media/schemas/media.schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "trendpilot-media-staging";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const mediaFields =
  "id, owner_id, created_by, bucket_id, object_path, original_filename, mime_type, file_size_bytes, width, height, alt_text, caption, status, reviewed_by, reviewed_at, created_at, updated_at";

const allowedMimeTypes = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

function detectImageMime(bytes) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return allowedMimeTypes.jpeg;
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return allowedMimeTypes.png;
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return allowedMimeTypes.webp;
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" &&
    ["avif", "avis"].includes(String.fromCharCode(...bytes.slice(8, 12)))
  ) {
    return allowedMimeTypes.avif;
  }

  return null;
}

function getExtension(mimeType) {
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
  };

  return extensions[mimeType];
}

function sanitizeFilename(filename) {
  const sanitized = String(filename || "image")
    .replace(/[\\/\u0000-\u001f\u007f]/g, "_")
    .trim()
    .slice(0, 255);

  return sanitized || "image";
}

function mapDatabaseError(error) {
  if (error.code === "23505") {
    throw new AuthError(
      "A media record with this storage path already exists.",
      409,
      "MEDIA_ALREADY_EXISTS",
    );
  }

  if (error.code === "23514" || error.code === "23503") {
    throw new AuthError(
      "The uploaded media did not satisfy the storage rules.",
      422,
      "MEDIA_VALIDATION_FAILED",
    );
  }

  if (error.code === "42501") {
    throw new AuthError(
      "You do not have permission to manage this media.",
      403,
      "MEDIA_PERMISSION_DENIED",
    );
  }

  throw error;
}

async function getPreviewUrl(supabase, asset) {
  if (asset.status === "archived") {
    return null;
  }

  if (asset.bucket_id === "trendpilot-media") {
    const { data } = supabase.storage
      .from("trendpilot-media")
      .getPublicUrl(asset.object_path);

    return data?.publicUrl ?? null;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(asset.object_path, 3600);

  if (error) {
    return null;
  }

  return data?.signedUrl ?? null;
}

export async function GET(request) {
  try {
    const { supabase } = await requireRole(["author", "editor", "admin"]);

    const url = new URL(request.url);

    const filterResult = mediaListFiltersSchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );

    if (!filterResult.success) {
      throw filterResult.error;
    }

    const filters = filterResult.data;

    let query = supabase
      .from("media_assets")
      .select(mediaFields, { count: "exact" })
      .order("created_at", { ascending: false });

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw error;
    }

    const items = await Promise.all(
      (data ?? []).map(async (asset) => ({
        ...asset,
        preview_url: await getPreviewUrl(supabase, asset),
      })),
    );

    const total = count ?? 0;

    return successResponse({
      items,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.ceil(total / filters.pageSize),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  let uploadedObjectPath = null;

  try {
    assertSameOrigin(request);

    const { supabase, user } = await requireRole(["author", "editor", "admin"]);

    const formData = await request.formData();
    const file = formData.get("file");

    if (
      !file ||
      typeof file.arrayBuffer !== "function" ||
      typeof file.size !== "number"
    ) {
      throw new AuthError(
        "Select an image to upload.",
        400,
        "MEDIA_FILE_REQUIRED",
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      throw new AuthError(
        "Images must be larger than zero bytes and no larger than 10 MB.",
        413,
        "MEDIA_FILE_SIZE_INVALID",
      );
    }

    const metadataResult = mediaMetadataSchema.safeParse({
      altText:
        typeof formData.get("altText") === "string"
          ? formData.get("altText")
          : "",
      caption:
        typeof formData.get("caption") === "string"
          ? formData.get("caption")
          : "",
    });

    if (!metadataResult.success) {
      throw metadataResult.error;
    }

    const metadata = metadataResult.data;

    const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());

    const detectedMime = detectImageMime(header);

    if (!detectedMime || (file.type && file.type !== detectedMime)) {
      throw new AuthError(
        "The selected file is not a supported, valid image.",
        415,
        "MEDIA_TYPE_INVALID",
      );
    }

    const extension = getExtension(detectedMime);
    const originalFilename = sanitizeFilename(file.name);

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");

    uploadedObjectPath = `${user.id}/${year}/${month}/${randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(uploadedObjectPath, file, {
        cacheControl: "3600",
        contentType: detectedMime,
        upsert: false,
      });

    if (uploadError) {
      throw new AuthError(
        "The image could not be uploaded to secure storage.",
        502,
        "MEDIA_STORAGE_UPLOAD_FAILED",
      );
    }

    const { data: asset, error: insertError } = await supabase
      .from("media_assets")
      .insert({
        owner_id: user.id,
        created_by: user.id,
        bucket_id: BUCKET,
        object_path: uploadedObjectPath,
        original_filename: originalFilename,
        mime_type: detectedMime,
        file_size_bytes: file.size,
        alt_text: metadata.altText,
        caption: metadata.caption,
        status: "staged",
      })
      .select(mediaFields)
      .single();

    if (insertError) {
      mapDatabaseError(insertError);
    }

    const previewUrl = await getPreviewUrl(supabase, asset);

    return successResponse(
      {
        ...asset,
        preview_url: previewUrl,
      },
      201,
      "Image uploaded successfully and is awaiting editorial approval.",
    );
  } catch (error) {
    if (uploadedObjectPath) {
      try {
        const adminSupabase = createSupabaseAdminClient();

        await adminSupabase.storage.from(BUCKET).remove([uploadedObjectPath]);
      } catch {
        // Preserve the original upload or database error.
      }
    }

    return handleApiError(error);
  }
}
