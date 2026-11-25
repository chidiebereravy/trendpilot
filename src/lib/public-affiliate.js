import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function getPublicAffiliatePlacements(articleId) {
  if (!articleId) return {};

  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
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
            status
          )
        )
      `,
      )
      .eq("article_id", articleId);

    if (error) throw error;

    const now = Date.now();
    const placements = {};

    for (const row of data ?? []) {
      const link = row.link;

      if (
        !link ||
        link.status !== "active" ||
        link.program?.status !== "active" ||
        (link.expires_at && new Date(link.expires_at).getTime() <= now)
      ) {
        continue;
      }

      placements[row.block_id] = {
        title: link.title,
        description: link.description,
        href: `/go/affiliate/${link.id}?articleId=${encodeURIComponent(articleId)}`,
        disclosureLabel: "Affiliate link",
      };
    }

    return placements;
  } catch (error) {
    console.error("Public affiliate placements query failed:", error);
    return {};
  }
}
