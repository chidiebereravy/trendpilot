import { requireRole, AuthError } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request) {
  try {
    const { supabase } = await requireRole(["admin", "editor"]);
    const { searchParams } = new URL(request.url);
    const sponsoredContentId = searchParams.get("sponsoredContentId");

    if (sponsoredContentId && !uuidPattern.test(sponsoredContentId)) {
      throw new AuthError(
        "The sponsored-content identifier is invalid.",
        400,
        "INVALID_SPONSORED_CONTENT_ID",
      );
    }

    const [campaignResult, articleResult, existingResult] = await Promise.all([
      supabase
        .from("ad_campaigns")
        .select("id, name, campaign_type, channel, status, starts_at, ends_at")
        .in("campaign_type", ["direct", "sponsored"])
        .eq("channel", "sponsored_content")
        .in("status", [
          "draft",
          "pending_review",
          "scheduled",
          "active",
          "paused",
        ])
        .order("updated_at", { ascending: false })
        .limit(200),

      supabase
        .from("articles")
        .select("id, title, slug, status, published_at, updated_at")
        .in("status", ["draft", "in_review", "scheduled", "published"])
        .order("updated_at", { ascending: false })
        .limit(500),

      supabase.from("sponsored_content").select("id, article_id").limit(1000),
    ]);

    if (campaignResult.error) throw campaignResult.error;
    if (articleResult.error) throw articleResult.error;
    if (existingResult.error) throw existingResult.error;

    const existingRecords = existingResult.data || [];
    const occupiedArticleIds = new Set(
      existingRecords
        .filter((record) => record.id !== sponsoredContentId)
        .map((record) => record.article_id),
    );

    const articles = (articleResult.data || []).filter(
      (article) => !occupiedArticleIds.has(article.id),
    );

    return successResponse({
      campaigns: campaignResult.data || [],
      articles,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
