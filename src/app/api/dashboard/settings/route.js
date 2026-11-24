import { AuthError, requireRole } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { updateGeneralSettingsSchema } from "@/features/settings/schemas/general-settings.schema";

const SETTINGS_FIELDS = [
  "id",
  "tagline",
  "logo_media_asset_id",
  "favicon_media_asset_id",
  "public_email",
  "support_email",
  "contact_phone",
  "contact_address",
  "facebook_url",
  "instagram_url",
  "x_url",
  "youtube_url",
  "linkedin_url",
  "updated_by",
  "created_at",
  "updated_at",
].join(", ");

const SETTINGS_COLUMN_MAP = Object.freeze({
  tagline: "tagline",
  logoMediaAssetId: "logo_media_asset_id",
  faviconMediaAssetId: "favicon_media_asset_id",
  publicEmail: "public_email",
  supportEmail: "support_email",
  contactPhone: "contact_phone",
  contactAddress: "contact_address",
  facebookUrl: "facebook_url",
  instagramUrl: "instagram_url",
  xUrl: "x_url",
  youtubeUrl: "youtube_url",
  linkedinUrl: "linkedin_url",
});

function toDatabaseSettings(values) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      const column = SETTINGS_COLUMN_MAP[key];

      if (!column) {
        throw new AuthError(
          "An unsupported general setting was provided.",
          400,
          "INVALID_GENERAL_SETTING",
        );
      }

      return [column, value];
    }),
  );
}

function toApiSettings(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    tagline: row.tagline,
    logoMediaAssetId: row.logo_media_asset_id,
    faviconMediaAssetId: row.favicon_media_asset_id,
    publicEmail: row.public_email,
    supportEmail: row.support_email,
    contactPhone: row.contact_phone,
    contactAddress: row.contact_address,
    facebookUrl: row.facebook_url,
    instagramUrl: row.instagram_url,
    xUrl: row.x_url,
    youtubeUrl: row.youtube_url,
    linkedinUrl: row.linkedin_url,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSettingsDatabaseError(error) {
  if (error?.code === "23514") {
    throw new AuthError(
      error.message?.includes("published Media Library asset")
        ? error.message
        : "One or more settings do not satisfy the database rules.",
      422,
      "GENERAL_SETTINGS_VALIDATION_FAILED",
    );
  }

  if (error?.code === "23503") {
    throw new AuthError(
      "A selected branding asset no longer exists. Refresh the Media Library and try again.",
      409,
      "BRANDING_ASSET_REFERENCE_CONFLICT",
    );
  }

  if (error?.code === "42501") {
    throw new AuthError(
      "You do not have permission to manage general settings.",
      403,
      "GENERAL_SETTINGS_PERMISSION_DENIED",
    );
  }

  throw error;
}

export async function GET() {
  try {
    const { supabase } = await requireRole(["admin"]);

    const { data, error } = await supabase
      .from("general_settings")
      .select(SETTINGS_FIELDS)
      .eq("id", 1)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new AuthError(
        "General settings could not be found.",
        404,
        "GENERAL_SETTINGS_NOT_FOUND",
      );
    }

    return successResponse(
      toApiSettings(data),
      200,
      "General settings loaded successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request) {
  try {
    assertSameOrigin(request);

    const { supabase } = await requireRole(["admin"]);

    const values = await readValidatedBody(
      request,
      updateGeneralSettingsSchema,
    );

    const databaseValues = toDatabaseSettings(values);

    const { data, error } = await supabase
      .from("general_settings")
      .update(databaseValues)
      .eq("id", 1)
      .select(SETTINGS_FIELDS)
      .maybeSingle();

    if (error) {
      mapSettingsDatabaseError(error);
    }

    if (!data) {
      throw new AuthError(
        "General settings could not be found.",
        404,
        "GENERAL_SETTINGS_NOT_FOUND",
      );
    }

    return successResponse(
      toApiSettings(data),
      200,
      "General settings updated successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
