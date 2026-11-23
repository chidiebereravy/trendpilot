import { createSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin } from "@/lib/api/request";
import { AuthError } from "@/lib/auth/session";

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new AuthError(
        "We could not end your session. Please try again.",
        500,
        "SIGN_OUT_FAILED",
      );
    }

    return successResponse(null, 200, "You have been signed out.");
  } catch (error) {
    return handleApiError(error);
  }
}
