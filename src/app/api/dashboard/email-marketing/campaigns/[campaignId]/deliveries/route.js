import { z } from "zod";
import { AuthError, requireRole } from "@/lib/auth/session";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { emailDeliveryReviewSchema } from "@/features/email-marketing/schemas/email-delivery-review.schema";

const paramsSchema = z.object({
  campaignId: z.string().uuid(),
});

const resolveSchema = emailDeliveryReviewSchema.extend({
  deliveryId: z.string().uuid(),
});

export async function GET(request, { params }) {
  try {
    await requireRole(["admin"]);

    const parsedParams = paramsSchema.safeParse(await params);

    if (!parsedParams.success) {
      throw new AuthError(
        "The campaign could not be found.",
        404,
        "EMAIL_CAMPAIGN_NOT_FOUND",
      );
    }

    const { campaignId } = parsedParams.data;
    const adminClient = createSupabaseAdminClient();

    const { data: campaign, error: campaignError } = await adminClient
      .from("email_campaigns")
      .select("id, status")
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

    const { data: deliveries, error: deliveryError } = await adminClient
      .from("email_campaign_deliveries")
      .select(
        "id, subscriber_id, provider_message_id, attempt_count, failure_reason, sent_at, failed_at",
      )
      .eq("campaign_id", campaignId)
      .eq("status", "uncertain")
      .order("failed_at", { ascending: false });

    if (deliveryError) throw deliveryError;

    const items = deliveries ?? [];
    const subscriberIds = [
      ...new Set(items.map((delivery) => delivery.subscriber_id)),
    ];

    let subscribersById = {};

    if (subscriberIds.length > 0) {
      const { data: subscribers, error: subscriberError } = await adminClient
        .from("email_subscribers")
        .select("id, email, display_name")
        .in("id", subscriberIds);

      if (subscriberError) throw subscriberError;

      subscribersById = Object.fromEntries(
        (subscribers ?? []).map((subscriber) => [subscriber.id, subscriber]),
      );
    }

    return successResponse({
      campaign,
      items: items.map((delivery) => ({
        ...delivery,
        subscriber: subscribersById[delivery.subscriber_id] ?? null,
      })),
      total: items.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, { params }) {
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

    const { campaignId } = parsedParams.data;

    const values = await readValidatedBody(request, resolveSchema);
    const adminClient = createSupabaseAdminClient();

    const { data: delivery, error: deliveryError } = await adminClient
      .from("email_campaign_deliveries")
      .select("id, status")
      .eq("id", values.deliveryId)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (deliveryError) throw deliveryError;

    if (!delivery) {
      throw new AuthError(
        "The delivery could not be found.",
        404,
        "EMAIL_DELIVERY_NOT_FOUND",
      );
    }

    if (delivery.status !== "uncertain") {
      throw new AuthError(
        "This delivery is no longer awaiting review.",
        409,
        "EMAIL_DELIVERY_NOT_UNCERTAIN",
      );
    }

    const { data, error } = await adminClient.rpc(
      "admin_resolve_uncertain_email_delivery",
      {
        p_delivery_id: values.deliveryId,
        p_actor_id: user.id,
        p_resolution_note: values.resolutionNote,
      },
    );

    if (error) {
      console.error(
        "[Email Marketing] Delivery resolution failed:",
        error.code,
      );

      throw new Error("The delivery could not be resolved.");
    }

    return successResponse(
      { deliveryId: values.deliveryId, result: data },
      200,
      "Uncertain delivery resolved as failed.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
