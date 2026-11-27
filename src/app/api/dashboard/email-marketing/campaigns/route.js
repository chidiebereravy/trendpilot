import { AuthError, requireRole } from "@/lib/auth/session";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";
import {
  createEmailCampaignSchema,
  emailCampaignFiltersSchema,
} from "@/features/email-marketing/schemas/email-marketing.schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const CAMPAIGN_FIELDS = [
  "id",
  "name",
  "subject",
  "preview_text",
  "from_name",
  "reply_to_email",
  "html_content",
  "text_content",
  "status",
  "scheduled_at",
  "started_at",
  "completed_at",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
].join(", ");

export async function GET(request) {
  try {
    const { supabase, role } = await requireRole(["admin", "editor"]);
    const url = new URL(request.url);

    const result = emailCampaignFiltersSchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );

    if (!result.success) throw result.error;

    const { status, search, page, pageSize } = result.data;

    const offset = (page - 1) * pageSize;

    let query = supabase
      .from("email_campaigns")
      .select(CAMPAIGN_FIELDS, { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      const safeSearch = search
        .replace(/[\\%_]/g, "\\$&")
        .replace(/[(),]/g, " ");

      query = query.ilike("name", `%${safeSearch}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const items = data ?? [];

    let deliveryCounts = {};

    if (role === "admin" && items.length > 0) {
      const adminClient = createSupabaseAdminClient();

      const { data: deliveries, error: deliveryError } = await adminClient
        .from("email_campaign_deliveries")
        .select("campaign_id, status")
        .in(
          "campaign_id",
          items.map((campaign) => campaign.id),
        );

      if (deliveryError) throw deliveryError;

      for (const delivery of deliveries ?? []) {
        if (!deliveryCounts[delivery.campaign_id]) {
          deliveryCounts[delivery.campaign_id] = {};
        }

        const counts = deliveryCounts[delivery.campaign_id];
        counts[delivery.status] = (counts[delivery.status] ?? 0) + 1;
      }
    }

    return successResponse({
      items: items.map((campaign) => ({
        ...campaign,
        delivery_counts:
          role === "admin" ? (deliveryCounts[campaign.id] ?? {}) : null,
      })),
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const { supabase, user } = await requireRole(["admin", "editor"]);

    assertSameOrigin(request);

    const values = await readValidatedBody(request, createEmailCampaignSchema);

    const { data, error } = await supabase
      .from("email_campaigns")
      .insert({
        ...values,
        status: "draft",
        created_by: user.id,
        updated_by: user.id,
      })
      .select(CAMPAIGN_FIELDS)
      .single();

    if (error) {
      if (error.code === "23514") {
        throw new AuthError(
          "The campaign information is invalid.",
          422,
          "INVALID_EMAIL_CAMPAIGN",
        );
      }

      throw error;
    }

    return successResponse(
      data,
      201,
      "Email campaign draft created successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
