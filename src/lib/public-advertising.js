import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PUBLIC_CAMPAIGN_FIELDS = [
  "id",
  "campaign_type",
  "channel",
  "status",
  "headline",
  "description",
  "image_url",
  "image_media_asset_id",
  "image_alt_text",
  "call_to_action_text",
  "destination_url",
  "starts_at",
  "ends_at",
].join(",");

async function getCampaignImage(campaign, supabase) {
  if (campaign.image_media_asset_id) {
    const { data: asset, error } = await supabase
      .from("media_assets")
      .select("id, bucket_id, object_path, alt_text, purpose, status")
      .eq("id", campaign.image_media_asset_id)
      .maybeSingle();

    if (error) throw error;

    if (
      asset &&
      asset.status === "published" &&
      asset.purpose === "advertisement" &&
      asset.bucket_id === "trendpilot-media"
    ) {
      const { data } = supabase.storage
        .from(asset.bucket_id)
        .getPublicUrl(asset.object_path);

      return {
        url: data?.publicUrl || null,
        altText:
          asset.alt_text || campaign.image_alt_text || "Advertisement image",
      };
    }

    return {
      url: null,
      altText: campaign.image_alt_text || "Advertisement image",
    };
  }

  return {
    url: campaign.image_url || null,
    altText: campaign.image_alt_text || "Advertisement image",
  };
}

function isEligibleCampaign(campaign, now) {
  if (
    !campaign ||
    !["direct", "sponsored", "house"].includes(campaign.campaign_type) ||
    !["display", "native"].includes(campaign.channel) ||
    campaign.status !== "active" ||
    !campaign.headline?.trim() ||
    !campaign.destination_url
  ) {
    return false;
  }

  let destination;

  try {
    destination = new URL(campaign.destination_url);
  } catch {
    return false;
  }

  if (
    !["http:", "https:"].includes(destination.protocol) ||
    !destination.hostname
  ) {
    return false;
  }

  if (campaign.starts_at && new Date(campaign.starts_at).getTime() > now) {
    return false;
  }

  if (campaign.ends_at && new Date(campaign.ends_at).getTime() <= now) {
    return false;
  }

  return true;
}

export async function getPublicAdPlacement(placementKey) {
  if (
    typeof placementKey !== "string" ||
    !/^[a-z0-9][a-z0-9_-]{1,79}$/.test(placementKey)
  ) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();

    const { data: placement, error: placementError } = await supabase
      .from("ad_placements")
      .select("id, name, placement_key, format, dimensions")
      .eq("placement_key", placementKey)
      .eq("status", "active")
      .maybeSingle();

    if (placementError) throw placementError;
    if (!placement) return null;

    const { data: assignments, error: assignmentsError } = await supabase
      .from("ad_campaign_placements")
      .select(
        `
          campaign:ad_campaigns!ad_campaign_placements_campaign_id_fkey (
            ${PUBLIC_CAMPAIGN_FIELDS},
            advertiser:advertisers!ad_campaigns_advertiser_id_fkey (
              status
            )
          )
        `,
      )
      .eq("placement_id", placement.id);

    if (assignmentsError) throw assignmentsError;

    const now = Date.now();

    const eligibleCampaigns = (assignments ?? [])
      .map((assignment) => assignment.campaign)
      .filter((campaign) => {
        if (!isEligibleCampaign(campaign, now)) return false;

        if (campaign.advertiser && campaign.advertiser.status !== "active") {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aStart = a.starts_at ? new Date(a.starts_at).getTime() : 0;
        const bStart = b.starts_at ? new Date(b.starts_at).getTime() : 0;

        return bStart - aStart || a.id.localeCompare(b.id);
      });

    const campaign = eligibleCampaigns[0];

    if (!campaign) return null;

    const campaignImage = await getCampaignImage(campaign, supabase);

    return {
      placement: {
        key: placement.placement_key,
        name: placement.name,
        format: placement.format,
        dimensions: placement.dimensions,
      },
      advertisement: {
        id: campaign.id,
        campaignType: campaign.campaign_type,
        channel: campaign.channel,
        headline: campaign.headline,
        description: campaign.description,
        imageUrl: campaignImage.url,
        imageAltText: campaignImage.altText,
        callToActionText: campaign.call_to_action_text || "Learn more",
        href: `/go/ad/${campaign.id}?placement=${encodeURIComponent(placement.placement_key)}`,
        disclosureLabel: "Advertisement",
      },
    };
  } catch (error) {
    console.error("Public ad placement query failed:", error);
    return null;
  }
}
