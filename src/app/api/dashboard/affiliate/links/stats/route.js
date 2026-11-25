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
    const isAdmin = role === "admin";

    const [
      { data: statusData, error: statusError },
      { data: performanceData, error: performanceError },
    ] = await Promise.all([
      supabase.rpc("affiliate_link_status_counts", {
        p_user_id: user.id,
        p_is_admin: isAdmin,
      }),
      supabase.rpc("get_affiliate_performance", {
        p_user_id: user.id,
        p_is_admin: isAdmin,
        p_start_date: null,
        p_end_date: null,
      }),
    ]);

    if (statusError) throw statusError;
    if (performanceError) throw performanceError;

    const row = statusData?.[0] ?? {};

    const stats = {
      draft: Number(row.draft ?? 0),
      pending_review: Number(row.pending_review ?? 0),
      approved: Number(row.approved ?? 0),
      active: Number(row.active ?? 0),
      paused: Number(row.paused ?? 0),
      expired: Number(row.expired ?? 0),
      archived: Number(row.archived ?? 0),
    };

    const total = Object.values(stats).reduce(
      (sum, count) => sum + count,
      0
    );

    const clicks = {
      total: Number(performanceData?.clicks?.total ?? 0),
      article: Number(performanceData?.clicks?.article ?? 0),
      other: Number(performanceData?.clicks?.other ?? 0),
    };

    const conversions = {
      total: Number(performanceData?.conversions?.total ?? 0),
      pending: Number(performanceData?.conversions?.pending ?? 0),
      confirmed: Number(performanceData?.conversions?.confirmed ?? 0),
      rejected: Number(performanceData?.conversions?.rejected ?? 0),
      reversed: Number(performanceData?.conversions?.reversed ?? 0),
    };

    const conversionRate =
      clicks.total > 0
        ? Number(
            ((conversions.confirmed / clicks.total) * 100).toFixed(2)
          )
        : 0;

    const commissions = Array.isArray(performanceData?.commissions)
      ? performanceData.commissions.map((item) => ({
          currency: item.currency,
          status: item.status,
          recordCount: Number(item.record_count ?? 0),
          totalAmount: Number(item.total_amount ?? 0),
        }))
      : [];

    return successResponse({
      stats,
      total,
      performance: {
        period: "all_time",
        clicks,
        conversions,
        conversionRate,
        commissions,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}