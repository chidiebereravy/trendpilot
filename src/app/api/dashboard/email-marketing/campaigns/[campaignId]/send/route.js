import { z } from "zod";
import { Resend } from "resend";
import { AuthError, requireRole } from "@/lib/auth/session";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCampaignUnsubscribeToken } from "@/features/email-marketing/lib/campaign-unsubscribe-token";


const BATCH_SIZE = 10;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

const paramsSchema = z.object({
  campaignId: z.string().uuid(),
});

const actionSchema = z.object({
  action: z.enum(["start", "process", "resume", "retry", "pause"]),
});

const CAMPAIGN_FIELDS = [
  "id",
  "name",
  "subject",
  "preview_text",
  "from_name",
  "reply_to_email",
  "html_content",
  "text_content",
  "status",
].join(", ");

function buildUnsubscribeContent(content, unsubscribeUrl, isHtml) {
  const placeholder = "{{unsubscribe_url}}";

  if (isHtml) {
    const link = `<p style="font-size:12px;color:#666;margin-top:24px;">You are receiving this email because you subscribed to TrendPilot updates. <a href="${unsubscribeUrl}">Unsubscribe</a>.</p>`;

    return content.includes(placeholder)
      ? content.split(placeholder).join(unsubscribeUrl)
      : `${content}${link}`;
  }

  const footer = `\n\nYou are receiving this email because you subscribed to TrendPilot updates.\nUnsubscribe: ${unsubscribeUrl}`;

  return content.includes(placeholder)
    ? content.split(placeholder).join(unsubscribeUrl)
    : `${content}${footer}`;
}

async function callRpc(supabase, name, args) {
  const { data, error } = await supabase.rpc(name, args);

  if (error) {
    console.error(`[Email Marketing] ${name} failed:`, error.code);
    throw new Error("The campaign operation could not be completed.");
  }

  return data;
}

async function processBatch({ supabase, resend, campaign }) {
  const claims = await callRpc(
    supabase,
    "admin_claim_email_campaign_deliveries",
    {
      p_campaign_id: campaign.id,
      p_limit: BATCH_SIZE,
    },
  );

  if (!Array.isArray(claims) || claims.length === 0) {
    const status = await callRpc(supabase, "admin_complete_email_campaign", {
      p_campaign_id: campaign.id,
    });

    return {
      processed: 0,
      failed: 0,
      hasMore: status === "sending",
      status,
    };
  }

  const deliveryIds = claims.map((claim) => claim.delivery_id);

  const { data: generationRows, error: generationError } = await supabase
    .from("email_campaign_deliveries")
    .select("id, send_generation")
    .in("id", deliveryIds);

  if (generationError) {
    throw new Error("Could not load campaign delivery information.");
  }

  const generations = new Map(
    (generationRows ?? []).map((row) => [row.id, row.send_generation]),
  );

  let processed = 0;
  let failed = 0;
  let uncertain = 0;

  for (const delivery of claims) {
    const generation = generations.get(delivery.delivery_id);

    if (!Number.isInteger(generation) || generation < 1) {
      await callRpc(supabase, "admin_record_email_delivery_result", {
        p_delivery_id: delivery.delivery_id,
        p_processing_token: delivery.processing_token,
        p_status: "failed",
        p_provider_message_id: null,
        p_failure_reason: "Invalid delivery generation.",
      });

      failed += 1;
      processed += 1;
      continue;
    }

    let sendAttempted = false;
    let providerAccepted = false;
    let providerMessageId = null;
    let definiteProviderRejection = false;
    try {
      const token = await getCampaignUnsubscribeToken(
        supabase,
        delivery.subscriber_id,
      );

      const unsubscribeUrl = `${APP_URL}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;

      const oneClickUnsubscribeUrl = `${APP_URL}/api/newsletter/unsubscribe/one-click?token=${encodeURIComponent(token)}`;

      const html = campaign.html_content?.trim()
        ? buildUnsubscribeContent(campaign.html_content, unsubscribeUrl, true)
        : undefined;

      const text = campaign.text_content?.trim()
        ? buildUnsubscribeContent(campaign.text_content, unsubscribeUrl, false)
        : undefined;

      const fromEmail = process.env.RESEND_FROM_EMAIL;
      const fromName =
        campaign.from_name?.trim() ||
        process.env.RESEND_FROM_NAME?.trim() ||
        "TrendPilot";

      if (!fromEmail) {
        throw new Error("The sender email address is not configured.");
      }

      const payload = {
        from: `${fromName} <${fromEmail}>`,
        to: [delivery.email],
        subject: campaign.subject,
        ...(campaign.preview_text
          ? { previewText: campaign.preview_text }
          : {}),
        ...(html ? { html } : {}),
        ...(text ? { text } : {}),
        ...(campaign.reply_to_email
          ? { replyTo: campaign.reply_to_email }
          : {}),
        headers: {
          "List-Unsubscribe": `<${oneClickUnsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },

        tags: [
          {
            name: "campaign_delivery_id",
            value: delivery.delivery_id,
          },
        ],
      };

      const idempotencyKey = `trendpilot-${campaign.id}-${delivery.delivery_id}-g${generation}`;

      sendAttempted = true;

      const { data: sent, error: sendError } = await resend.emails.send(
        payload,
        { idempotencyKey },
      );

      if (sendError) {
        const statusCode = sendError.statusCode;

        definiteProviderRejection =
          Number.isInteger(statusCode) &&
          statusCode >= 400 &&
          statusCode < 500 &&
          ![409, 429].includes(statusCode);

        throw new Error(
          sendError.message || "The email provider returned an error.",
        );
      }

      if (!sent?.id) {
        throw new Error("The email provider did not confirm the send.");
      }

      providerAccepted = true;
      providerMessageId = sent.id;

      const linked = await callRpc(
        supabase,
        "admin_link_email_delivery_provider_message",
        {
          p_delivery_id: delivery.delivery_id,
          p_provider_message_id: sent.id,
        },
      );

      if (!linked) {
        throw new Error("Could not link the provider message to its delivery.");
      }

      const recorded = await callRpc(
        supabase,
        "admin_record_email_delivery_result",
        {
          p_delivery_id: delivery.delivery_id,
          p_processing_token: delivery.processing_token,
          p_status: "sent",
          p_provider_message_id: sent.id,
          p_failure_reason: null,
        },
      );

      if (!recorded) {
        const { data: currentDelivery, error: currentDeliveryError } =
          await supabase
            .from("email_campaign_deliveries")
            .select("status, provider_message_id")
            .eq("id", delivery.delivery_id)
            .maybeSingle();

        if (currentDeliveryError || !currentDelivery) {
          throw new Error("Could not verify the delivery status.");
        }

        const advancedStatuses = [
          "sent",
          "delivered",
          "opened",
          "clicked",
          "bounced",
          "complained",
        ];

        if (
          !advancedStatuses.includes(currentDelivery.status) ||
          currentDelivery.provider_message_id !== sent.id
        ) {
          throw new Error("The delivery result could not be confirmed.");
        }
      }
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.message.slice(0, 500)
          : "Unknown email delivery error.";

      const isUncertain =
        providerAccepted || (sendAttempted && !definiteProviderRejection);

      try {
        await callRpc(supabase, "admin_record_email_delivery_result", {
          p_delivery_id: delivery.delivery_id,
          p_processing_token: delivery.processing_token,
          p_status: isUncertain ? "uncertain" : "failed",
          p_provider_message_id: providerMessageId,
          p_failure_reason: reason,
        });
      } catch {
        // Leave unresolved processing leases for the database recovery safeguard.
      }

      if (isUncertain) {
        uncertain += 1;
      } else {
        failed += 1;
      }
    }

    processed += 1;
  }

  const status = await callRpc(supabase, "admin_complete_email_campaign", {
    p_campaign_id: campaign.id,
  });

  return {
    processed,
    failed,
    uncertain,
    hasMore: status === "sending",
    status,
  };
}

export async function POST(request, { params }) {
  try {
    const { user } = await requireRole(["admin"]);

    assertSameOrigin(request);

    const parsedParams = paramsSchema.safeParse(await params);

    if (!parsedParams.success) {
      throw new AuthError(
        "The campaign could not be found.",
        404,
        "EMAIL_CAMPAIGN_NOT_FOUND",
      );
    }

    const { action } = await readValidatedBody(request, actionSchema);
    const { campaignId } = parsedParams.data;

    if (!APP_URL || !process.env.RESEND_API_KEY) {
      throw new AuthError(
        "Email sending is not configured.",
        503,
        "EMAIL_SENDING_NOT_CONFIGURED",
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select(CAMPAIGN_FIELDS)
      .eq("id", campaignId)
      .maybeSingle();

    if (campaignError) throw campaignError;

    if (!campaign) {
      throw new AuthError(
        "The campaign could not be found.",
        404,
        "EMAIL_CAMPAIGN_NOT_FOUND",
      );
    }

    if (action === "pause") {
      const { data: paused, error: pauseError } = await supabase
        .from("email_campaigns")
        .update({ status: "paused", updated_by: user.id })
        .eq("id", campaignId)
        .eq("status", "sending")
        .select("id, status")
        .maybeSingle();

      if (pauseError) throw pauseError;

      if (!paused) {
        throw new AuthError(
          "Only a sending campaign can be paused.",
          409,
          "EMAIL_CAMPAIGN_NOT_SENDING",
        );
      }

      return successResponse(
        {
          status: paused.status,
          processed: 0,
          failed: 0,
          uncertain: 0,
          hasMore: false,
        },
        200,
        "Campaign paused. Already claimed emails may still finish sending.",
      );
    }

    if (action === "process" && campaign.status !== "sending") {
      throw new AuthError(
        "This campaign is not currently sending.",
        409,
        "EMAIL_CAMPAIGN_NOT_SENDING",
      );
    }

    if (action === "start" || action === "resume") {
      if (!campaign.html_content?.trim() && !campaign.text_content?.trim()) {
        throw new AuthError(
          "Add HTML or plain-text content before sending this campaign.",
          422,
          "EMAIL_CAMPAIGN_CONTENT_REQUIRED",
        );
      }

      if (
        action === "start" &&
        !["draft", "pending_review", "scheduled"].includes(campaign.status)
      ) {
        throw new AuthError(
          "This campaign cannot be started from its current status.",
          409,
          "EMAIL_CAMPAIGN_INVALID_STATUS",
        );
      }

      if (action === "resume" && campaign.status !== "paused") {
        throw new AuthError(
          "Only a paused campaign can be resumed.",
          409,
          "EMAIL_CAMPAIGN_NOT_PAUSED",
        );
      }

      await callRpc(supabase, "admin_prepare_email_campaign", {
        p_campaign_id: campaignId,
        p_actor_id: user.id,
      });
    }

    if (action === "retry") {
      await callRpc(supabase, "admin_retry_failed_email_campaign", {
        p_campaign_id: campaignId,
        p_actor_id: user.id,
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const result = await processBatch({
      supabase,
      resend,
      campaign,
    });

    return successResponse(
      result,

      200,
      result.status === "sent"
        ? "Campaign sending completed."
        : "Campaign batch processed.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
