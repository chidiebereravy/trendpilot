import { requireRole } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function countRows(client, table, filters = {}) {
  let query = client.from(table).select("id", {
    count: "exact",
    head: true,
  });

  for (const [column, value] of Object.entries(filters)) {
    query = query.eq(column, value);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function GET() {
  try {
    const { supabase, profile } = await requireRole(["admin", "editor"]);

    const [
      placementsTotal,
      placementsActive,
      campaignsTotal,
      campaignsActive,
      campaignsScheduled,
      sponsoredTotal,
      sponsoredPublished,
      emailCampaignsTotal,
      emailCampaignsSending,
      emailCampaignsScheduled,
      metricsRecords,
    ] = await Promise.all([
      countRows(supabase, "ad_placements"),
      countRows(supabase, "ad_placements", { status: "active" }),
      countRows(supabase, "ad_campaigns"),
      countRows(supabase, "ad_campaigns", { status: "active" }),
      countRows(supabase, "ad_campaigns", { status: "scheduled" }),
      countRows(supabase, "sponsored_content"),
      countRows(supabase, "sponsored_content", { status: "published" }),
      countRows(supabase, "email_campaigns"),
      countRows(supabase, "email_campaigns", { status: "sending" }),
      countRows(supabase, "email_campaigns", { status: "scheduled" }),
      countRows(supabase, "advertising_daily_metrics"),
    ]);

    let administratorOverview = null;

    if (profile.role === "admin") {
      const adminClient = createSupabaseAdminClient();

      const [
        networksTotal,
        networksConnected,
        advertisersTotal,
        advertisersActive,
        subscribersTotal,
        subscribersSubscribed,
        revenueRecords,
        revenuePaid,
        revenueConfirmed,
      ] = await Promise.all([
        countRows(adminClient, "ad_network_connections"),
        countRows(adminClient, "ad_network_connections", {
          status: "connected",
        }),
        countRows(adminClient, "advertisers"),
        countRows(adminClient, "advertisers", { status: "active" }),
        countRows(adminClient, "email_subscribers"),
        countRows(adminClient, "email_subscribers", {
          status: "subscribed",
        }),
        countRows(adminClient, "monetization_revenue"),
        countRows(adminClient, "monetization_revenue", {
          revenue_status: "paid",
        }),
        countRows(adminClient, "monetization_revenue", {
          revenue_status: "confirmed",
        }),
      ]);

      administratorOverview = {
        networks: {
          total: networksTotal,
          connected: networksConnected,
        },
        advertisers: {
          total: advertisersTotal,
          active: advertisersActive,
        },
        subscribers: {
          total: subscribersTotal,
          subscribed: subscribersSubscribed,
        },
        revenue: {
          records: revenueRecords,
          paidRecords: revenuePaid,
          confirmedRecords: revenueConfirmed,
        },
      };
    }

    return successResponse(
      {
        role: profile.role,
        workspace: {
          placements: {
            total: placementsTotal,
            active: placementsActive,
          },
          campaigns: {
            total: campaignsTotal,
            active: campaignsActive,
            scheduled: campaignsScheduled,
          },
          sponsoredContent: {
            total: sponsoredTotal,
            published: sponsoredPublished,
          },
          emailCampaigns: {
            total: emailCampaignsTotal,
            sending: emailCampaignsSending,
            scheduled: emailCampaignsScheduled,
          },
          metrics: {
            records: metricsRecords,
          },
        },
        administrator: administratorOverview,
      },
      200,
      "Advertising overview retrieved successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
