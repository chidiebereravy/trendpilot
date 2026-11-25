import { AuthError, requireRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { updateCampaignSchema } from "@/features/advertising/schemas/advertising.schema";

const EDITOR_FIELDS =
  "id, name, campaign_type, channel, objective, headline, description, image_url, image_media_asset_id, image_alt_text, call_to_action_text, destination_url, status, starts_at, ends_at, created_at, updated_at";

const ADMIN_FIELDS = `${EDITOR_FIELDS}, advertiser_id, network_connection_id`;
const MEDIA_ASSET_FIELDS =
  "id, bucket_id, object_path, original_filename, mime_type, width, height, purpose, alt_text, caption, status";

async function attachCampaignMediaPreview(campaign, adminClient) {
  if (!campaign?.image_media_asset_id) {
    return {
      ...campaign,
      image_media_asset: null,
    };
  }

  const { data: asset, error } = await adminClient
    .from("media_assets")
    .select(MEDIA_ASSET_FIELDS)
    .eq("id", campaign.image_media_asset_id)
    .maybeSingle();

  if (error) throw error;

  if (!asset) {
    return {
      ...campaign,
      image_media_asset: null,
    };
  }

  const isValidAsset =
    asset.status === "published" &&
    asset.purpose === "advertisement" &&
    asset.bucket_id === "trendpilot-media";

  const { data } = isValidAsset
    ? adminClient.storage.from(asset.bucket_id).getPublicUrl(asset.object_path)
    : { data: null };

  return {
    ...campaign,
    image_media_asset: {
      ...asset,
      preview_url: data?.publicUrl ?? null,
    },
  };
}

async function validateAdminAssociations(supabase, values) {
  if (values.advertiser_id) {
    const { data, error } = await supabase
      .from("advertisers")
      .select("id, status")
      .eq("id", values.advertiser_id)
      .maybeSingle();

    if (error) throw error;

    if (!data || data.status === "blacklisted") {
      throw new AuthError(
        "The selected advertiser is unavailable.",
        422,
        "INVALID_ADVERTISER",
      );
    }
  }

  if (values.network_connection_id) {
    const { data, error } = await supabase
      .from("ad_network_connections")
      .select("id")
      .eq("id", values.network_connection_id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new AuthError(
        "The selected advertising network account was not found.",
        422,
        "INVALID_NETWORK_CONNECTION",
      );
    }
  }
}

export async function PATCH(request, { params }) {
  try {
    const { supabase, user, profile } = await requireRole(["admin", "editor"]);

    assertSameOrigin(request);

    const { campaignId } = await params;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        campaignId,
      )
    ) {
      throw new AuthError(
        "The campaign identifier is invalid.",
        400,
        "INVALID_CAMPAIGN_ID",
      );
    }

    const values = await readValidatedBody(request, updateCampaignSchema);

    if (
      profile.role !== "admin" &&
      ["active", "rejected"].includes(values.status)
    ) {
      throw new AuthError(
        "Only administrators can activate or reject campaigns.",
        403,
        "CAMPAIGN_STATUS_FORBIDDEN",
      );
    }

    if (
      profile.role !== "admin" &&
      ("advertiser_id" in values || "network_connection_id" in values)
    ) {
      throw new AuthError(
        "Only administrators can change advertiser or advertising network assignments.",
        403,
        "CAMPAIGN_ASSOCIATION_FORBIDDEN",
      );
    }

    if (profile.role === "admin") {
      await validateAdminAssociations(supabase, values);
    }

    const { placement_ids: placementIds, ...campaignValues } = values;

    const payload = {
      ...campaignValues,
      updated_by: user.id,
    };

    const { data, error } = await supabase
      .from("ad_campaigns")
      .update(payload)
      .eq("id", campaignId)
      .select(profile.role === "admin" ? ADMIN_FIELDS : EDITOR_FIELDS)
      .maybeSingle();

    if (error) {
      if (error.code === "23514" || error.code === "23503") {
        throw new AuthError(
          "The selected campaign image is invalid or is not a published advertisement image in the Media Library.",
          422,
          "INVALID_CAMPAIGN_MEDIA",
        );
      }

      throw error;
    }

    if (placementIds !== undefined) {
      const adminSupabase = createSupabaseAdminClient();

      const { error: placementError } = await adminSupabase.rpc(
        "replace_ad_campaign_placements",
        {
          p_campaign_id: campaignId,
          p_placement_ids: placementIds,
        },
      );

      if (placementError) {
        console.error("Campaign placement assignment failed:", placementError);

        throw new AuthError(
          "Campaign details were updated, but placement assignments could not be saved. Please retry the placement update.",
          422,
          "CAMPAIGN_PLACEMENT_ASSIGNMENT_FAILED",
        );
      }
    }

    const campaignWithMedia = await attachCampaignMediaPreview(
      data,
      createSupabaseAdminClient(),
    );

    return successResponse(
      campaignWithMedia,
      200,
      "Campaign updated successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
