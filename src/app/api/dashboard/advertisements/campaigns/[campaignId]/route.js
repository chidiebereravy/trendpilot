import { AuthError, requireRole } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { updateCampaignSchema } from "@/features/advertising/schemas/advertising.schema";

const EDITOR_FIELDS =
  "id, name, campaign_type, channel, objective, destination_url, status, starts_at, ends_at, created_at, updated_at";

const ADMIN_FIELDS = `${EDITOR_FIELDS}, advertiser_id, network_connection_id`;

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

    const payload = {
      ...values,
      updated_by: user.id,
    };

    const { data, error } = await supabase
      .from("ad_campaigns")
      .update(payload)
      .eq("id", campaignId)
      .select(profile.role === "admin" ? ADMIN_FIELDS : EDITOR_FIELDS)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new AuthError(
        "The campaign was not found or could not be updated.",
        404,
        "CAMPAIGN_NOT_FOUND",
      );
    }

    return successResponse(data, 200, "Campaign updated successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}
