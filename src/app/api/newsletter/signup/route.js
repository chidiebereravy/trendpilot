import "server-only";

import { Resend } from "resend";
import { newsletterSignupSchema } from "@/features/newsletter/schemas/newsletter.schema";
import { createConfirmationToken } from "@/features/newsletter/lib/confirmation-token";
import {
  createSignupFingerprint,
  getClientIp,
} from "@/features/newsletter/lib/signup-security";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import {
  errorResponse,
  handleApiError,
  successResponse,
} from "@/lib/api/response";
import { AuthError } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const GENERIC_SUCCESS_MESSAGE =
  "If your address is eligible, you'll receive an email with instructions to confirm your subscription.";

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const body = await readValidatedBody(request, newsletterSignupSchema);

    // Quietly accept honeypot submissions without processing them.
    if (body.website.trim()) {
      return successResponse(null, 200, GENERIC_SUCCESS_MESSAGE);
    }

    const apiKey = process.env.RESEND_API_KEY;
    const sender = process.env.RESEND_FROM_EMAIL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const clientIp = getClientIp(request);

    if (!apiKey || !sender || !appUrl || !clientIp) {
      throw new AuthError(
        "The newsletter service is temporarily unavailable.",
        503,
        "NEWSLETTER_SERVICE_UNAVAILABLE",
      );
    }

    const normalizedEmail = body.email.trim().toLowerCase();

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase.rpc("register_newsletter_signup", {
      p_email: normalizedEmail,
      p_display_name: body.name.trim() || null,
      p_ip_hash: createSignupFingerprint(clientIp),
      p_email_hash: createSignupFingerprint(normalizedEmail),
      p_policy_version: "v1",
    });

    if (error) {
      console.error("[Newsletter] Signup database operation failed:", {
        code: error.code,
        message: error.message,
      });

      throw new AuthError(
        "We could not process your subscription right now. Please try again later.",
        503,
        "NEWSLETTER_SIGNUP_FAILED",
      );
    }

    const result = Array.isArray(data) ? data[0] : null;

    if (!result) {
      throw new AuthError(
        "We could not process your subscription right now. Please try again later.",
        503,
        "NEWSLETTER_SIGNUP_FAILED",
      );
    }

    if (result.outcome === "rate_limited") {
      return errorResponse(
        "Too many signup attempts. Please try again later.",
        429,
        "NEWSLETTER_RATE_LIMITED",
      );
    }

    // Do not reveal whether an address is subscribed, suppressed, or blocked.
    if (result.outcome !== "pending" || !result.subscriber_id) {
      return successResponse(null, 200, GENERIC_SUCCESS_MESSAGE);
    }

    const token = createConfirmationToken(result.subscriber_id);
    const confirmationUrl = new URL("/newsletter/confirm", appUrl);
    confirmationUrl.searchParams.set("token", token);

    const resend = new Resend(apiKey);

    const { error: emailError } = await resend.emails.send({
      from: sender,
      to: [normalizedEmail],
      subject: "Confirm your TrendPilot newsletter subscription",
      text: [
        "Thank you for joining the TrendPilot newsletter.",
        "",
        "Please confirm your subscription by opening this link:",
        confirmationUrl.toString(),
        "",
        "This link expires in 24 hours.",
        "If you did not request this subscription, you can ignore this email.",
      ].join("\n"),
    });

    if (emailError) {
      console.error("[Newsletter] Confirmation email failed:", {
        name: emailError.name,
        message: emailError.message,
        statusCode: emailError.statusCode,
      });

      throw new AuthError(
        "We could not send your confirmation email right now. Please try again later.",
        502,
        "NEWSLETTER_EMAIL_FAILED",
      );
    }

    return successResponse(null, 200, GENERIC_SUCCESS_MESSAGE);
  } catch (error) {
    return handleApiError(error);
  }
}
