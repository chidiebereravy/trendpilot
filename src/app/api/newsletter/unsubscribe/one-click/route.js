import "server-only";

import { createHash } from "node:crypto";
import { newsletterUnsubscribeSchema } from "@/features/newsletter/schemas/newsletter-unsubscribe.schema";
import {
  errorResponse,
  handleApiError,
  successResponse,
} from "@/lib/api/response";
import { AuthError } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";


export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (
      !contentType.toLowerCase().startsWith("application/x-www-form-urlencoded")
    ) {
      throw new AuthError(
        "Invalid unsubscribe request.",
        400,
        "NEWSLETTER_UNSUBSCRIBE_INVALID_REQUEST",
      );
    }

    const contentLength = Number(request.headers.get("content-length") || 0);

    if (contentLength > 1024) {
      throw new AuthError(
        "Invalid unsubscribe request.",
        400,
        "NEWSLETTER_UNSUBSCRIBE_INVALID_REQUEST",
      );
    }

    const url = new URL(request.url);
    const tokens = url.searchParams.getAll("token");

    if (tokens.length !== 1) {
      throw new AuthError(
        "Invalid unsubscribe link.",
        400,
        "NEWSLETTER_UNSUBSCRIBE_TOKEN_INVALID",
      );
    }

    const parsedToken = newsletterUnsubscribeSchema.safeParse({
      token: tokens[0],
    });

    if (!parsedToken.success) {
      throw new AuthError(
        "Invalid unsubscribe link.",
        400,
        "NEWSLETTER_UNSUBSCRIBE_TOKEN_INVALID",
      );
    }

    const body = await request.text();

    if (body.length > 1024) {
      throw new AuthError(
        "Invalid unsubscribe request.",
        400,
        "NEWSLETTER_UNSUBSCRIBE_INVALID_REQUEST",
      );
    }

    const form = new URLSearchParams(body);

    if (
      form.get("List-Unsubscribe") !== "One-Click" ||
      [...form.keys()].some((key) => key !== "List-Unsubscribe")
    ) {
      throw new AuthError(
        "Invalid one-click unsubscribe request.",
        400,
        "NEWSLETTER_UNSUBSCRIBE_INVALID_REQUEST",
      );
    }

    const tokenHash = createHash("sha256")
      .update(parsedToken.data.token)
      .digest("hex");

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase.rpc("unsubscribe_newsletter", {
      p_token_hash: tokenHash,
    });

    if (error) {
      console.error("[Newsletter] One-click unsubscribe failed:", {
        code: error.code,
      });

      throw new AuthError(
        "We could not process your unsubscribe request right now.",
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

    if (
      result.outcome === "unsubscribed" ||
      result.outcome === "already_processed"
    ) {
      return successResponse(
        null,
        200,
        "Your newsletter subscription has been cancelled.",
      );
    }

    if (result.outcome === "expired_token") {
      return errorResponse(
        "This unsubscribe link has expired.",
        400,
        "NEWSLETTER_UNSUBSCRIBE_TOKEN_EXPIRED",
      );
    }

    return errorResponse(
      "This unsubscribe link is invalid.",
      400,
      "NEWSLETTER_UNSUBSCRIBE_TOKEN_INVALID",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
