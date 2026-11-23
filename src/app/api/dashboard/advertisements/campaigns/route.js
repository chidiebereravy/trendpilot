import { AuthError, requireRole } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import {
  campaignFiltersSchema,
  createCampaignSchema,
} from "@/features/advertising/schemas/advertising.schema";

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

    return successResponse({
      items: data ?? [],
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

    const payload = {
      ...values,
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

      throw error;
    }

    return successResponse(data, 201, "Campaign created successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}
