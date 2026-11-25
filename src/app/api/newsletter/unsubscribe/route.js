import "server-only";

import { createHash } from "node:crypto";
import { newsletterUnsubscribeSchema } from "@/features/newsletter/schemas/newsletter-unsubscribe.schema";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import {
  errorResponse,
  handleApiError,
  successResponse,
} from "@/lib/api/response";
import { AuthError } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const body = await readValidatedBody(request, newsletterUnsubscribeSchema);

    const tokenHash = createHash("sha256").update(body.token).digest("hex");

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase.rpc("unsubscribe_newsletter", {
      p_token_hash: tokenHash,
    });

    if (error) {
      console.error("[Newsletter] Unsubscribe operation failed:", {
        code: error.code,
        message: error.message,
      });

      throw new AuthError(
        "We could not process your unsubscribe request right now. Please try again later.",
        503,
        "NEWSLETTER_UNSUBSCRIBE_FAILED",
      );
    }

    const result = Array.isArray(data) ? data[0] : null;

    if (!result) {
      throw new AuthError(
        "We could not process your unsubscribe request.",
        503,
        "NEWSLETTER_UNSUBSCRIBE_FAILED",
      );
    }

    if (result.outcome === "unsubscribed") {
      return successResponse(
        null,
        200,
        "Your newsletter subscription has been successfully cancelled.",
      );
    }

    if (result.outcome === "already_processed") {
      return successResponse(
        null,
        200,
        "This unsubscribe link has already been used.",
      );
    }

    if (result.outcome === "expired_token") {
      return errorResponse(
        "This unsubscribe link has expired. Please contact us for assistance.",
        400,
        "NEWSLETTER_UNSUBSCRIBE_TOKEN_EXPIRED",
      );
    }

    return errorResponse(
      "This unsubscribe link is invalid. Please contact us for assistance.",
      400,
      "NEWSLETTER_UNSUBSCRIBE_TOKEN_INVALID",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
