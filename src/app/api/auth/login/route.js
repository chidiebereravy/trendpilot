import { createSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { loginSchema } from "@/features/auth/schemas/auth.schema";
import { AuthError } from "@/lib/auth/session";

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const body = await readValidatedBody(request, loginSchema);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error || !data.user) {
      throw new AuthError(
        "The email address or password is incorrect, or the account has not been verified.",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    return successResponse(
      {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
      200,
      "You are now signed in.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
