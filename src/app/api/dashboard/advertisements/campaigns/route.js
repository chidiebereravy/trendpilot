import { AuthError, requireRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import {
  campaignFiltersSchema,
  createCampaignSchema,
} from "@/features/advertising/schemas/advertising.schema";

const EDITOR_FIELDS =
  "id, name, campaign_type, channel, objective, headline, description, image_url, image_media_asset_id, image_alt_text, call_to_action_text, destination_url, status, starts_at, ends_at, created_at, updated_at";

const ADMIN_FIELDS = `${EDITOR_FIELDS}, advertiser_id, network_connection_id`;
const MEDIA_ASSET_FIELDS =
  "id, bucket_id, object_path, original_filename, mime_type, width, height, purpose, alt_text, caption, status";

async function attachCampaignMediaPreviews(campaigns, adminClient) {
  const assetIds = [
    ...new Set(
      campaigns
        .map((campaign) => campaign.image_media_asset_id)
        .filter(Boolean),
    ),
  ];

  if (assetIds.length === 0) {
    return campaigns.map((campaign) => ({
      ...campaign,
      image_media_asset: null,
    }));
  }

  const { data: assets, error } = await adminClient
    .from("media_assets")
    .select(MEDIA_ASSET_FIELDS)
    .in("id", assetIds);

  if (error) throw error;

  const assetsById = new Map(
    (assets ?? []).map((asset) => {
      const isValidAsset =
        asset.status === "published" &&
        asset.purpose === "advertisement" &&
        asset.bucket_id === "trendpilot-media";

      const { data } = isValidAsset
        ? adminClient.storage
            .from(asset.bucket_id)
            .getPublicUrl(asset.object_path)
        : { data: null };

      return [
        asset.id,
        {
          ...asset,
          preview_url: data?.publicUrl ?? null,
        },
      ];
    }),
  );

  return campaigns.map((campaign) => ({
    ...campaign,
    image_media_asset: assetsById.get(campaign.image_media_asset_id) ?? null,
  }));
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
      .select("id, status")
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

export async function GET(request) {
  try {
    const { supabase, profile } = await requireRole(["admin", "editor"]);
    const url = new URL(request.url);

    const result = campaignFiltersSchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );

    if (!result.success) throw result.error;

    const filters = result.data;
    const fields = profile.role === "admin" ? ADMIN_FIELDS : EDITOR_FIELDS;

    let query = supabase
      .from("ad_campaigns")
      .select(fields, { count: "exact" })
      .order("updated_at", { ascending: false })
      .limit(filters.limit);

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.campaignType) {
      query = query.eq("campaign_type", filters.campaignType);
    }
    if (filters.channel) query = query.eq("channel", filters.channel);

    if (filters.search) {
      const search = filters.search
        .replace(/[\\%_]/g, "\\$&")
        .replace(/[(),]/g, " ");

      query = query.ilike("name", `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const campaignItems = data ?? [];
    const campaignIds = campaignItems.map((campaign) => campaign.id);

    let placementIdsByCampaign = {};

    if (campaignIds.length > 0) {
      const { data: assignments, error: assignmentError } = await supabase
        .from("ad_campaign_placements")
        .select("campaign_id, placement_id")
        .in("campaign_id", campaignIds);

      if (assignmentError) throw assignmentError;

      placementIdsByCampaign = (assignments ?? []).reduce(
        (result, assignment) => {
          if (!result[assignment.campaign_id]) {
            result[assignment.campaign_id] = [];
          }

          result[assignment.campaign_id].push(assignment.placement_id);
          return result;
        },
        {},
      );
    }

    const campaignsWithMedia = await attachCampaignMediaPreviews(
      campaignItems,
      createSupabaseAdminClient(),
    );

    return successResponse({
      items: campaignsWithMedia.map((campaign) => ({
        ...campaign,
        placement_ids: placementIdsByCampaign[campaign.id] ?? [],
      })),
      total: count ?? 0,
      limit: filters.limit,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const { supabase, user, profile } = await requireRole(["admin", "editor"]);

    assertSameOrigin(request);

    const values = await readValidatedBody(request, createCampaignSchema);

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
      (values.advertiser_id || values.network_connection_id)
    ) {
      throw new AuthError(
        "Only administrators can assign advertisers or advertising networks.",
        403,
        "CAMPAIGN_ASSOCIATION_FORBIDDEN",
      );
    }

    if (profile.role === "admin") {
      await validateAdminAssociations(supabase, values);
    }

    const { placement_ids: placementIds = [], ...campaignValues } = values;

    const payload = {
      ...campaignValues,
      advertiser_id:
        profile.role === "admin" ? (values.advertiser_id ?? null) : null,
      network_connection_id:
        profile.role === "admin"
          ? (values.network_connection_id ?? null)
          : null,
      created_by: user.id,
      updated_by: user.id,
    };

    const { data, error } = await supabase
      .from("ad_campaigns")
      .insert(payload)
      .select(profile.role === "admin" ? ADMIN_FIELDS : EDITOR_FIELDS)
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new AuthError(
          "A campaign with conflicting information already exists.",
          409,
          "CAMPAIGN_CONFLICT",
        );
      }

      if (error.code === "23514") {
        throw new AuthError(
          "The selected campaign image is invalid or is not a published advertisement image in the Media Library.",
          422,
          "INVALID_CAMPAIGN_MEDIA",
        );
      }

      if (error.code === "23503") {
        throw new AuthError(
          "The selected Media Library image could not be found.",
          422,
          "INVALID_CAMPAIGN_MEDIA",
        );
      }

      throw error;
    }

    if (placementIds.length > 0) {
      const adminSupabase = createSupabaseAdminClient();

      const { error: placementError } = await adminSupabase.rpc(
        "replace_ad_campaign_placements",
        {
          p_campaign_id: data.id,
          p_placement_ids: placementIds,
        },
      );

      if (placementError) {
        const { error: cleanupError } = await adminSupabase
          .from("ad_campaigns")
          .delete()
          .eq("id", data.id);

        if (cleanupError) {
          console.error(
            "Failed to clean up campaign after placement assignment failure:",
            cleanupError,
          );
        }

        throw new AuthError(
          "Campaign placements could not be saved. Please review the selected placements and try again.",
          422,
          "CAMPAIGN_PLACEMENT_ASSIGNMENT_FAILED",
        );
      }
    }

    const [campaignWithMedia] = await attachCampaignMediaPreviews(
      [data],
      createSupabaseAdminClient(),
    );

    return successResponse(
      campaignWithMedia,
      201,
      "Campaign created successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
