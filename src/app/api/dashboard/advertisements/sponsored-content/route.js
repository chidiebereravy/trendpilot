import { requireRole, AuthError } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import {
  createSponsoredContentSchema,
  sponsoredContentFiltersSchema,
} from "@/features/advertising/schemas/sponsored-content.schema";

const sponsoredContentFields =
  "id, campaign_id, article_id, disclosure_label, status, starts_at, ends_at, created_by, created_at, updated_at";

const eligibleCampaignStatuses = [
  "draft",
  "pending_review",
  "scheduled",
  "active",
  "paused",
];

function handleDatabaseError(error) {
  if (error.code === "23505") {
    throw new AuthError(
      "This article already has a sponsored-content record.",
      409,
      "SPONSORED_CONTENT_ARTICLE_EXISTS",
    );
  }

  if (error.code === "23503") {
    throw new AuthError(
      "The selected campaign or article is no longer available.",
      409,
      "SPONSORED_CONTENT_REFERENCE_INVALID",
    );
  }

  if (error.code === "23514" || error.code === "P0001") {
    throw new AuthError(
      error.message || "The sponsored-content record violates a database rule.",
      422,
      "SPONSORED_CONTENT_RULE_VIOLATION",
    );
  }

  if (error.code === "42501") {
    throw new AuthError(
      "You do not have permission to perform this operation.",
      403,
      "SPONSORED_CONTENT_PERMISSION_DENIED",
    );
  }

  throw error;
}

async function getRelatedRecords(supabase, records) {
  const campaignIds = [...new Set(records.map((item) => item.campaign_id))];
  const articleIds = [...new Set(records.map((item) => item.article_id))];

  const [campaignResult, articleResult] = await Promise.all([
    campaignIds.length
      ? supabase
          .from("ad_campaigns")
          .select(
            "id, name, campaign_type, channel, status, starts_at, ends_at",
          )
          .in("id", campaignIds)
      : Promise.resolve({ data: [], error: null }),
    articleIds.length
      ? supabase
          .from("articles")
          .select("id, title, slug, status, published_at")
          .in("id", articleIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (campaignResult.error) throw campaignResult.error;
  if (articleResult.error) throw articleResult.error;

  const campaigns = new Map(
    (campaignResult.data || []).map((item) => [item.id, item]),
  );
  const articles = new Map(
    (articleResult.data || []).map((item) => [item.id, item]),
  );

  return records.map((record) => ({
    ...record,
    campaign: campaigns.get(record.campaign_id) || null,
    article: articles.get(record.article_id) || null,
  }));
}

export async function GET(request) {
  try {
    const { supabase } = await requireRole(["admin", "editor"]);
    const searchParams = Object.fromEntries(
      new URL(request.url).searchParams.entries(),
    );
    const parsed = sponsoredContentFiltersSchema.safeParse(searchParams);

    if (!parsed.success) {
      throw parsed.error;
    }

    const { status, campaignId, search, page, pageSize } = parsed.data;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("sponsored_content")
      .select(sponsoredContentFields, { count: "exact" })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);

    if (status) query = query.eq("status", status);
    if (campaignId) query = query.eq("campaign_id", campaignId);
    if (search) query = query.ilike("disclosure_label", `%${search}%`);

    const { data, error, count } = await query;

    if (error) throw error;

    const records = await getRelatedRecords(supabase, data || []);

    return successResponse({
      items: records,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const { supabase, user } = await requireRole(["admin", "editor"]);
    const body = await readValidatedBody(request, createSponsoredContentSchema);

    const [campaignResult, articleResult] = await Promise.all([
      supabase
        .from("ad_campaigns")
        .select("id, campaign_type, channel, status")
        .eq("id", body.campaign_id)
        .maybeSingle(),
      supabase
        .from("articles")
        .select("id, status")
        .eq("id", body.article_id)
        .maybeSingle(),
    ]);

    if (campaignResult.error) throw campaignResult.error;
    if (articleResult.error) throw articleResult.error;

    const campaign = campaignResult.data;
    const article = articleResult.data;

    if (!campaign) {
      throw new AuthError(
        "The selected campaign was not found.",
        404,
        "SPONSORED_CONTENT_CAMPAIGN_NOT_FOUND",
      );
    }

    if (
      !["direct", "sponsored"].includes(campaign.campaign_type) ||
      campaign.channel !== "sponsored_content"
    ) {
      throw new AuthError(
        "Select a direct or sponsored campaign configured for sponsored content.",
        422,
        "SPONSORED_CONTENT_CAMPAIGN_INELIGIBLE",
      );
    }

    if (!eligibleCampaignStatuses.includes(campaign.status)) {
      throw new AuthError(
        "The selected campaign is not available for sponsored content.",
        422,
        "SPONSORED_CONTENT_CAMPAIGN_UNAVAILABLE",
      );
    }

    if (!article) {
      throw new AuthError(
        "The selected article was not found.",
        404,
        "SPONSORED_CONTENT_ARTICLE_NOT_FOUND",
      );
    }

    if (article.status === "archived") {
      throw new AuthError(
        "Archived articles cannot be assigned to sponsored content.",
        422,
        "SPONSORED_CONTENT_ARTICLE_ARCHIVED",
      );
    }

    const { data, error } = await supabase
      .from("sponsored_content")
      .insert({
        campaign_id: body.campaign_id,
        article_id: body.article_id,
        disclosure_label: body.disclosure_label,
        status: body.status,
        starts_at: body.starts_at ?? null,
        ends_at: body.ends_at ?? null,
        created_by: user.id,
      })
      .select(sponsoredContentFields)
      .single();

    if (error) handleDatabaseError(error);

    const [record] = await getRelatedRecords(supabase, [data]);

    return successResponse(
      record,
      201,
      "Sponsored-content record created successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
