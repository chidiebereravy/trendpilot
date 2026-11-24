import { AuthError, requireAuthContext } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { changeProfilePasswordSchema } from "@/features/profile/schemas/profile.schema";

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const { supabase } = await requireAuthContext();
    const body = await readValidatedBody(request, changeProfilePasswordSchema);

    const { error } = await supabase.auth.updateUser({
      password: body.password,
    });

    if (error) {
      console.error("[PROFILE PASSWORD UPDATE] Supabase rejected update:", {
        name: error.name,
        status: error.status,
        code: error.code,
        message: error.message,
      });

      throw new AuthError(
        "Your password could not be changed. Please try again.",
        400,
        "PASSWORD_UPDATE_FAILED",
      );
    }

    return successResponse(
      null,
      200,
      "Your password has been changed successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
