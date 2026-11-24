import { assertSameOrigin } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";
import { requireAuthContext } from "@/lib/auth/session";

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const { supabase, user } = await requireAuthContext();

    const { count, error } = await supabase
      .from("notifications")
      .update({
        read_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .is("read_at", null)
      .select("id", { count: "exact" });

    if (error) {
      throw error;
    }

    return successResponse({
      updatedCount: count ?? 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
