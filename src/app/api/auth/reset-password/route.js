import { requireAuthenticatedUser, AuthError } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { resetPasswordSchema } from "@/features/auth/schemas/auth.schema";

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const { supabase } = await requireAuthenticatedUser();
    const body = await readValidatedBody(request, resetPasswordSchema);

    const { error } = await supabase.auth.updateUser({
      password: body.password,
    });

    if (error) {
      console.error("[AUTH PASSWORD UPDATE] Supabase rejected update:", {
        name: error.name,
        status: error.status,
        code: error.code,
        message: error.message,
      });

      throw new AuthError(
        "Your password could not be updated. Please request a new reset link and try again.",
        400,
        "PASSWORD_UPDATE_FAILED",
      );
    }

    return successResponse(null, 200, "Your password has been updated.");
  } catch (error) {
    return handleApiError(error);
  }
}
