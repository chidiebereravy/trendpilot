import "server-only";

import { Resend } from "resend";
import { contactSchema } from "@/features/contact/schemas/contact.schema";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";
import { AuthError } from "@/lib/auth/session";

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const body = await readValidatedBody(request, contactSchema);

    // Quietly accept honeypot submissions without sending email.
    if (body.website.trim()) {
      return successResponse(null, 200, "Your message has been received.");
    }

    const apiKey = process.env.RESEND_API_KEY;
    const recipient = process.env.CONTACT_EMAIL;
    const sender = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !recipient || !sender) {
      throw new AuthError(
        "The contact service is temporarily unavailable.",
        503,
        "CONTACT_SERVICE_UNAVAILABLE",
      );
    }

    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: sender,
      to: [recipient],
      replyTo: body.email,
      subject: `[TrendPilot Contact] ${body.subject}`,
      text: [
        "A new contact message was submitted through TrendPilot.",
        "",
        `Name: ${body.name}`,
        `Email: ${body.email}`,
        `Subject: ${body.subject}`,
        "",
        "Message:",
        body.message,
      ].join("\n"),
    });

    if (error) {
      console.error("[Contact] Resend email failed:", {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
      });

      throw new AuthError(
        "We could not send your message right now. Please try again later.",
        502,
        "CONTACT_EMAIL_FAILED",
      );
    }

    return successResponse(
      null,
      200,
      "Your message has been sent successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
