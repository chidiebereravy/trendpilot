import { NextResponse } from "next/server";
import { Resend } from "resend";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";


const SUPPORTED_EVENTS = new Set([
  "email.sent",
  "email.delivered",
  "email.opened",
  "email.clicked",
  "email.bounced",
  "email.complained",
  "email.failed",
]);

function getCampaignDeliveryId(tags) {
  if (!Array.isArray(tags)) return null;

  const tag = tags.find((item) => item?.name === "campaign_delivery_id");

  return typeof tag?.value === "string" ? tag.value : null;
}

function getRecipientEmail(to) {
  const recipient = Array.isArray(to) ? to[0] : to;

  if (typeof recipient !== "string") return null;

  const email = recipient.trim().toLowerCase();

  return email && email.length <= 254 ? email : null;
}

export async function POST(request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;

  if (!webhookSecret || !apiKey) {
    console.error("Resend webhook configuration is incomplete.");

    return NextResponse.json(
      { success: false, message: "Webhook is not configured." },
      { status: 503 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);

  if (contentLength > 1_000_000) {
    return NextResponse.json(
      { success: false, message: "Payload too large." },
      { status: 413 },
    );
  }

  const eventId = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");

  if (!eventId || !timestamp || !signature) {
    return NextResponse.json(
      { success: false, message: "Missing webhook signature headers." },
      { status: 400 },
    );
  }

  let payload;
  let event;

  try {
    payload = await request.text();

    if (payload.length > 1_000_000) {
      return NextResponse.json(
        { success: false, message: "Payload too large." },
        { status: 413 },
      );
    }

    const resend = new Resend(apiKey);

    event = resend.webhooks.verify({
      payload,
      headers: {
        id: eventId,
        timestamp,
        signature,
      },
      webhookSecret,
    });
  } catch (error) {
    console.warn("Resend webhook signature verification failed.");

    return NextResponse.json(
      { success: false, message: "Invalid webhook signature." },
      { status: 400 },
    );
  }

  if (!event?.type || !event?.data) {
    return NextResponse.json(
      { success: false, message: "Invalid webhook event." },
      { status: 400 },
    );
  }

  if (!SUPPORTED_EVENTS.has(event.type)) {
    return NextResponse.json({
      success: true,
      received: true,
      ignored: true,
    });
  }

  const providerMessageId =
    typeof event.data.email_id === "string" && event.data.email_id.trim()
      ? event.data.email_id.trim()
      : null;

  const deliveryId = getCampaignDeliveryId(event.data.tags);
  const recipientEmail = getRecipientEmail(event.data.to);

  try {
    const supabase = createSupabaseAdminClient();

    // The signed campaign tag handles the race where a webhook
    // arrives before the sender stores the provider message ID.
    if (deliveryId && providerMessageId) {
      const { data: linked, error: linkError } = await supabase.rpc(
        "admin_link_email_delivery_provider_message",
        {
          p_delivery_id: deliveryId,
          p_provider_message_id: providerMessageId,
        },
      );

      if (linkError) {
        console.error(
          "Unable to link Resend message to campaign delivery:",
          linkError.code,
        );

        return NextResponse.json(
          { success: false, message: "Unable to process webhook." },
          { status: 500 },
        );
      }

      if (linked !== true) {
        console.error("Resend campaign delivery could not be linked.");

        return NextResponse.json(
          { success: false, message: "Unable to link campaign delivery." },
          { status: 500 },
        );
      }
    }

    const { error } = await supabase.rpc("admin_process_resend_webhook_event", {
      p_event_id: eventId,
      p_event_type: event.type,
      p_provider_message_id: providerMessageId,
      p_recipient_email: recipientEmail,
      p_occurred_at: event.created_at || null,
    });

    if (error) {
      console.error("Resend webhook database processing failed:", error.code);

      return NextResponse.json(
        { success: false, message: "Unable to process webhook." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      received: true,
    });
  } catch (error) {
    console.error(
      "Resend webhook processing failed:",
      error?.message || "Unknown error",
    );

    return NextResponse.json(
      { success: false, message: "Unable to process webhook." },
      { status: 500 },
    );
  }
}
