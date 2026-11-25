import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function redirectResponse(destinationUrl) {
  const response = NextResponse.redirect(destinationUrl, 302);

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");

  return response;
}

function getReferrerHost(request) {
  const referrer = request.headers.get("referer");

  if (!referrer) return null;

  try {
    return new URL(referrer).hostname.slice(0, 253) || null;
  } catch {
    return null;
  }
}

function getUserAgentFamily(request) {
  const userAgent = request.headers.get("user-agent") || "";

  if (/bot|crawler|spider|slurp/i.test(userAgent)) return "bot";
  if (/Edg\//i.test(userAgent)) return "Edge";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) {
    return "Chrome";
  }
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) {
    return "Safari";
  }

  return "Other";
}

function isValidHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(request, { params }) {
  try {
    const { linkId } = await params;

    if (
      typeof linkId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        linkId,
      )
    ) {
      return new NextResponse("Affiliate link not found.", { status: 404 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: link, error: linkError } = await supabase
      .from("affiliate_links")
      .select(
        `
        id,
        destination_url,
        status,
        expires_at,
        program:affiliate_programs!affiliate_links_program_id_fkey (
          status
        )
      `,
      )
      .eq("id", linkId)
      .maybeSingle();

    if (linkError) throw linkError;

    if (
      !link ||
      link.status !== "active" ||
      link.program?.status !== "active" ||
      (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) ||
      !isValidHttpsUrl(link.destination_url)
    ) {
      return new NextResponse("Affiliate link is unavailable.", {
        status: 404,
      });
    }

    const requestUrl = new URL(request.url);
    const articleId = requestUrl.searchParams.get("articleId");
    let attributedArticleId = null;

    if (articleId) {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          articleId,
        );

      if (!isUuid) {
        return new NextResponse("Invalid affiliate attribution.", {
          status: 400,
        });
      }

      const { data: placement, error: placementError } = await supabase
        .from("affiliate_link_articles")
        .select(
          `
          article_id,
          article:articles!affiliate_link_articles_article_id_fkey (
            id,
            status,
            published_at
          )
        `,
        )
        .eq("article_id", articleId)
        .eq("affiliate_link_id", link.id)
        .maybeSingle();

      if (placementError) throw placementError;

      const article = placement?.article;
      const publishedAt = article?.published_at
        ? new Date(article.published_at).getTime()
        : NaN;

      if (
        !article ||
        article.status !== "published" ||
        !Number.isFinite(publishedAt) ||
        publishedAt > Date.now()
      ) {
        return new NextResponse("Affiliate attribution is unavailable.", {
          status: 404,
        });
      }

      attributedArticleId = article.id;
    }

    const { error: clickError } = await supabase
      .from("affiliate_click_events")
      .insert({
        affiliate_link_id: link.id,
        article_id: attributedArticleId,
        click_id: randomUUID(),
        visitor_hash: null,
        referrer_host: getReferrerHost(request),
        user_agent_family: getUserAgentFamily(request),
        clicked_at: new Date().toISOString(),
      });

    if (clickError) {
      console.error("Affiliate click recording failed:", clickError);
    }

    return redirectResponse(link.destination_url);
  } catch (error) {
    console.error("Affiliate redirect failed:", error);

    return new NextResponse("Unable to process this affiliate link.", {
      status: 500,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
}
