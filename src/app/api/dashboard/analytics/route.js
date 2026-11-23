import { requireRole } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { analyticsQuerySchema } from "@/features/analytics/schemas/analytics.schema";

export async function GET(request) {
  try {
    await requireRole(["admin", "editor"]);

    const url = new URL(request.url);
    const parsed = analyticsQuerySchema.safeParse({
      range: url.searchParams.get("range") ?? "30d",
    });

    if (!parsed.success) {
      throw parsed.error;
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc(
      "admin_get_dashboard_analytics",
      {
        p_range: parsed.data.range,
      },
    );

    if (error) {
      throw error;
    }

    return successResponse(
      data,
      200,
      "Dashboard analytics loaded successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
