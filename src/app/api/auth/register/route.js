import { createSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { registerSchema } from "@/features/auth/schemas/auth.schema";
import { AuthError } from "@/lib/auth/session";

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const body = await readValidatedBody(request, registerSchema);
    const supabase = await createSupabaseServerClient();

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: {
          display_name: body.displayName,
        },
        emailRedirectTo: `${appUrl}/auth/confirm`,
      },
    });

    if (error) {
      throw new AuthError(
        "We could not process this registration. Check your details and try again.",
        400,
        "REGISTRATION_FAILED",
      );
    }

    const hasSession = Boolean(data.session);

    return successResponse(
      {
        requiresEmailVerification: !hasSession,
        user:
          hasSession && data.user
            ? {
                id: data.user.id,
                email: data.user.email,
              }
            : null,
      },
      hasSession ? 201 : 202,
      hasSession
        ? "Your account has been created."
        : "If the address can be registered, you will receive a verification email.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
