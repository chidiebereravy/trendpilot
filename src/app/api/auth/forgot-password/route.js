import { createSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { forgotPasswordSchema } from "@/features/auth/schemas/auth.schema";
import { AuthError } from "@/lib/auth/session";

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const body = await readValidatedBody(request, forgotPasswordSchema);

    const supabase = await createSupabaseServerClient();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo: `${appUrl}/auth/recover`,
    });

    if (error) {
      throw new AuthError(
        "We cannot process your password reset request right now. Please try again later.",
        503,
        "PASSWORD_RESET_UNAVAILABLE",
      );
    }

    return successResponse(
      null,
      200,
      "If an account exists for that email address, password reset instructions will be sent.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
