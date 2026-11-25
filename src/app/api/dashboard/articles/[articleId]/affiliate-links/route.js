import { AuthError, requireRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";
import { articleIdSchema } from "@/features/articles/schemas/article.schema";
import { affiliatePlacementsSchema } from "@/features/affiliate/schemas/affiliate-placement.schema";

const ARTICLE_FIELDS = "id, author_id, status, content";

function validateArticleAccess(article, user, role) {
  if (role === "author") {
    if (article.author_id !== user.id) {
      throw new AuthError(
        "You can only manage affiliate links on your own articles.",
        403,
        "ARTICLE_OWNERSHIP_REQUIRED",
      );
    }

    if (!["draft", "in_review"].includes(article.status)) {
      throw new AuthError(
        "You can only manage affiliate links on drafts or articles awaiting review.",
        403,
        "ARTICLE_STATUS_NOT_EDITABLE",
      );
    }

    return;
  }

  if (article.status === "archived") {
    throw new AuthError(
      "Affiliate links cannot be managed on archived articles.",
      403,
      "ARTICLE_STATUS_NOT_EDITABLE",
    );
  }
}

async function getArticle(supabase, articleId) {
  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_FIELDS)
    .eq("id", articleId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new AuthError(
      "The requested article was not found.",
      404,
      "ARTICLE_NOT_FOUND",
    );
  }

  return data;
}

function validateArticleBlocks(article, placements) {
  const blocks = Array.isArray(article.content?.content)
    ? article.content.content
    : [];

  const blockIds = new Set(
    blocks.map((block) => block?.id).filter((id) => typeof id === "string"),
  );

  for (const placement of placements) {
    if (!blockIds.has(placement.blockId)) {
      throw new AuthError(
        "One or more selected article blocks no longer exist. Save the article and try again.",
        409,
        "ARTICLE_BLOCK_NOT_FOUND",
      );
    }
  }
}

function isEligibleLink(link, now) {
  return (
    link.status === "active" &&
    link.program?.status === "active" &&
    (!link.expires_at || new Date(link.expires_at).getTime() > now)
  );
}

export async function GET(request, { params }) {
  try {
    const {
      supabase: userSupabase,
      user,
      profile,
    } = await requireRole(["author", "editor", "admin"]);

    const { articleId } = await params;
    const idResult = articleIdSchema.safeParse(articleId);

    if (!idResult.success) {
      throw new AuthError(
        "The article identifier is invalid.",
        400,
        "INVALID_ARTICLE_ID",
      );
    }

    const article = await getArticle(userSupabase, articleId);
    validateArticleAccess(article, user, profile.role);

    const adminSupabase = createSupabaseAdminClient();

    const [
      { data: placementRows, error: placementError },
      { data: linkRows, error: linkError },
    ] = await Promise.all([
      adminSupabase
        .from("affiliate_link_articles")
        .select(
          `
          block_id,
          affiliate_link_id,
          link:affiliate_links!affiliate_link_articles_affiliate_link_id_fkey (
            id,
            title,
            description,
            status,
            expires_at,
            program:affiliate_programs!affiliate_links_program_id_fkey (
              id,
              name,
              status
            )
          )
        `,
        )
        .eq("article_id", articleId),
      adminSupabase
        .from("affiliate_links")
        .select(
          `
          id,
          title,
          description,
          status,
          expires_at,
          program:affiliate_programs!affiliate_links_program_id_fkey (
            id,
            name,
            status
          )
        `,
        )
        .eq("status", "active")
        .order("title", { ascending: true })
        .limit(500),
    ]);

    if (placementError) throw placementError;
    if (linkError) throw linkError;

    const now = Date.now();

    const eligibleLinks = (linkRows ?? [])
      .filter((link) => isEligibleLink(link, now))
      .map((link) => ({
        id: link.id,
        title: link.title,
        description: link.description,
        program: link.program
          ? {
              id: link.program.id,
              name: link.program.name,
            }
          : null,
        expiresAt: link.expires_at,
      }));

    const placements = (placementRows ?? []).map((row) => ({
      blockId: row.block_id,
      affiliateLinkId: row.affiliate_link_id,
      link: row.link
        ? {
            id: row.link.id,
            title: row.link.title,
            description: row.link.description,
            status: row.link.status,
            expiresAt: row.link.expires_at,
            program: row.link.program
              ? {
                  id: row.link.program.id,
                  name: row.link.program.name,
                  status: row.link.program.status,
                }
              : null,
          }
        : null,
    }));

    return successResponse({
      placements,
      eligibleLinks,
      article: {
        id: article.id,
        status: article.status,
        blocks: (Array.isArray(article.content?.content)
          ? article.content.content
          : []
        ).map((block) => ({
          id: block.id ?? null,
          type: block.type ?? "unknown",
          text: typeof block.text === "string" ? block.text.slice(0, 180) : "",
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    assertSameOrigin(request);

    const {
      supabase: userSupabase,
      user,
      profile,
    } = await requireRole(["author", "editor", "admin"]);

    const { articleId } = await params;
    const idResult = articleIdSchema.safeParse(articleId);

    if (!idResult.success) {
      throw new AuthError(
        "The article identifier is invalid.",
        400,
        "INVALID_ARTICLE_ID",
      );
    }

    const { placements } = await readValidatedBody(
      request,
      affiliatePlacementsSchema,
    );

    const article = await getArticle(userSupabase, articleId);
    validateArticleAccess(article, user, profile.role);
    validateArticleBlocks(article, placements);

    const adminSupabase = createSupabaseAdminClient();

    const { data, error } = await adminSupabase.rpc(
      "replace_article_affiliate_placements",
      {
        p_article_id: articleId,
        p_created_by: user.id,
        p_placements: placements.map((placement) => ({
          blockId: placement.blockId,
          affiliateLinkId: placement.affiliateLinkId,
        })),
      },
    );

    if (error) {
      if (error.code === "P0001") {
        throw new AuthError(
          error.message ||
            "One or more affiliate links are no longer eligible.",
          409,
          "AFFILIATE_PLACEMENT_CONFLICT",
        );
      }

      throw error;
    }

    return successResponse(
      {
        articleId,
        placementCount: Number(data ?? placements.length),
      },
      200,
      "Article affiliate placements saved successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
