import { requireRole, AuthError } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { updateSponsoredContentSchema } from "@/features/advertising/schemas/sponsored-content.schema";

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

async function getRelatedRecords(supabase, record) {
  const [campaignResult, articleResult] = await Promise.all([
    supabase
      .from("ad_campaigns")
      .select("id, name, campaign_type, channel, status, starts_at, ends_at")
      .eq("id", record.campaign_id)
      .maybeSingle(),
    supabase
      .from("articles")
      .select("id, title, slug, status, published_at")
      .eq("id", record.article_id)
      .maybeSingle(),
  ]);

  if (campaignResult.error) throw campaignResult.error;
  if (articleResult.error) throw articleResult.error;

  return {
    ...record,
    campaign: campaignResult.data || null,
    article: articleResult.data || null,
  };
}

export async function PATCH(request, { params }) {
  try {
    assertSameOrigin(request);

    const { supabase, user, profile } = await requireRole(["admin", "editor"]);

    const { sponsoredContentId } = await params;

    if (
      typeof sponsoredContentId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sponsoredContentId,
      )
    ) {
      throw new AuthError(
        "The sponsored-content identifier is invalid.",
        400,
        "INVALID_SPONSORED_CONTENT_ID",
      );
    }

    const body = await readValidatedBody(request, updateSponsoredContentSchema);

    const { data: existing, error: existingError } = await supabase
      .from("sponsored_content")
      .select(sponsoredContentFields)
      .eq("id", sponsoredContentId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (!existing) {
      throw new AuthError(
        "The sponsored-content record was not found.",
        404,
        "SPONSORED_CONTENT_NOT_FOUND",
      );
    }

    const isAdmin = profile.role === "admin";

    if (!isAdmin) {
      if (!["draft", "pending_review"].includes(existing.status)) {
        throw new AuthError(
          "Editors can only manage sponsored-content drafts and submissions awaiting review.",
          403,
          "SPONSORED_CONTENT_STATUS_LOCKED",
        );
      }

      if (
        body.status !== undefined &&
        !["draft", "pending_review"].includes(body.status)
      ) {
        throw new AuthError(
          "Only administrators can approve, publish, pause, or archive sponsored content.",
          403,
          "SPONSORED_CONTENT_STATUS_FORBIDDEN",
        );
      }
    }

    const campaignId = body.campaign_id ?? existing.campaign_id;
    const articleId = body.article_id ?? existing.article_id;

    const startsAt = Object.hasOwn(body, "starts_at")
      ? body.starts_at
      : existing.starts_at;

    const endsAt = Object.hasOwn(body, "ends_at")
      ? body.ends_at
      : existing.ends_at;

    if (
      startsAt &&
      endsAt &&
      new Date(endsAt).getTime() <= new Date(startsAt).getTime()
    ) {
      throw new AuthError(
        "The end date must be later than the start date.",
        422,
        "SPONSORED_CONTENT_INVALID_DATE_RANGE",
      );
    }

    const nextStatus = body.status ?? existing.status;

    const [campaignResult, articleResult] = await Promise.all([
      supabase
        .from("ad_campaigns")
        .select("id, campaign_type, channel, status")
        .eq("id", campaignId)
        .maybeSingle(),
      supabase
        .from("articles")
        .select("id, status")
        .eq("id", articleId)
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

    if (nextStatus === "published") {
      if (campaign.status !== "active") {
        throw new AuthError(
          "The campaign must be active before sponsored content can be published.",
          422,
          "SPONSORED_CONTENT_CAMPAIGN_NOT_ACTIVE",
        );
      }

      if (article.status !== "published") {
        throw new AuthError(
          "The associated article must already be published. Publishing sponsored content does not publish the article.",
          422,
          "SPONSORED_CONTENT_ARTICLE_NOT_PUBLISHED",
        );
      }

      const now = Date.now();

      if (startsAt && new Date(startsAt).getTime() > now) {
        throw new AuthError(
          "Sponsored content cannot be published before its start date.",
          422,
          "SPONSORED_CONTENT_NOT_STARTED",
        );
      }

      if (endsAt && new Date(endsAt).getTime() <= now) {
        throw new AuthError(
          "Expired sponsored content cannot be published.",
          422,
          "SPONSORED_CONTENT_EXPIRED",
        );
      }
    }

    const updates = {};

    const fieldMap = {
      campaign_id: "campaign_id",
      article_id: "article_id",
      disclosure_label: "disclosure_label",
      status: "status",
      starts_at: "starts_at",
      ends_at: "ends_at",
    };

    for (const [inputField, databaseField] of Object.entries(fieldMap)) {
      if (Object.hasOwn(body, inputField)) {
        updates[databaseField] = body[inputField];
      }
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("sponsored_content")
      .update(updates)
      .eq("id", sponsoredContentId)
      .select(sponsoredContentFields)
      .single();

    if (error) handleDatabaseError(error);

    const record = await getRelatedRecords(supabase, data);

    return successResponse(
      record,
      200,
      "Sponsored-content record updated successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
