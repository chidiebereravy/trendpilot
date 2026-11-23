import { requireRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError, successResponse } from "@/lib/api/response";

export async function GET() {
  try {
    const {
      user,
      profile: { role },
    } = await requireRole(["admin", "editor"]);

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase.rpc("affiliate_link_status_counts", {
      p_user_id: user.id,
      p_is_admin: role === "admin",
    });

    if (error) throw error;

    const row = data?.[0] ?? {};

    const stats = {
      draft: Number(row.draft ?? 0),
      pending_review: Number(row.pending_review ?? 0),
      approved: Number(row.approved ?? 0),
      active: Number(row.active ?? 0),
      paused: Number(row.paused ?? 0),
      expired: Number(row.expired ?? 0),
      archived: Number(row.archived ?? 0),
    };

    const total = Object.values(stats).reduce((sum, count) => sum + count, 0);

    return successResponse({
      stats,
      total,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
