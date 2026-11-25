import "server-only";

import { newsletterConfirmationSchema } from "@/features/newsletter/schemas/newsletter-confirmation.schema";
import { verifyConfirmationToken } from "@/features/newsletter/lib/confirmation-token";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";
import { AuthError } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const CONFIRMATION_MESSAGE =
  "Your newsletter subscription has been confirmed, or has already been confirmed.";

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const body = await readValidatedBody(
      request,
      newsletterConfirmationSchema,
    );

    const verifiedToken = verifyConfirmationToken(body.token);

    if (!verifiedToken) {
      throw new AuthError(
        "This confirmation link is invalid or has expired. Please request a new subscription confirmation.",
        400,
        "NEWSLETTER_CONFIRMATION_INVALID",
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase.rpc(
      "confirm_newsletter_subscription",
      {
        p_subscriber_id: verifiedToken.subscriberId,
        p_policy_version: "v1",
      },
    );

    if (error) {
      console.error("[Newsletter] Confirmation database operation failed:", {
        code: error.code,
        message: error.message,
      });

      throw new AuthError(
        "We could not confirm your subscription right now. Please try again later.",
        503,
        "NEWSLETTER_CONFIRMATION_FAILED",
      );
    }

    const result = Array.isArray(data) ? data[0] : null;

    if (
      !result ||
      !["confirmed", "already_confirmed"].includes(result.outcome)
    ) {
      throw new AuthError(
        "This confirmation link is no longer valid. Please request a new subscription confirmation.",
        400,
        "NEWSLETTER_CONFIRMATION_UNAVAILABLE",
      );
    }

    return successResponse(null, 200, CONFIRMATION_MESSAGE);
  } catch (error) {
    return handleApiError(error);
  }
}
