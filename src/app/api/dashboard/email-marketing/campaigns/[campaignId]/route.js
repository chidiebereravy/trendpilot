import { z } from "zod";
import { AuthError, requireRole } from "@/lib/auth/session";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";
import { updateEmailCampaignSchema } from "@/features/email-marketing/schemas/email-marketing.schema";

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
  "scheduled_at",
  "started_at",
  "completed_at",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
].join(", ");

const paramsSchema = z.object({
  campaignId: z.string().uuid(),
});

export async function PATCH(request, { params }) {
  try {
    const { supabase, user } = await requireRole(["admin", "editor"]);

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

    const values = await readValidatedBody(request, updateEmailCampaignSchema);

    const { data: existing, error: lookupError } = await supabase
      .from("email_campaigns")
      .select("id, status, html_content, text_content")
      .eq("id", campaignId)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (!existing) {
      throw new AuthError(
        "The campaign could not be found.",
        404,
        "EMAIL_CAMPAIGN_NOT_FOUND",
      );
    }

    if (existing.status !== "draft") {
      throw new AuthError(
        "Only draft campaigns can be edited.",
        409,
        "EMAIL_CAMPAIGN_NOT_EDITABLE",
      );
    }

    const finalHtml =
      values.html_content !== undefined
        ? values.html_content
        : existing.html_content;

    const finalText =
      values.text_content !== undefined
        ? values.text_content
        : existing.text_content;

    if (!finalHtml?.trim() && !finalText?.trim()) {
      throw new AuthError(
        "A campaign must contain HTML or plain-text email content.",
        422,
        "EMAIL_CAMPAIGN_CONTENT_REQUIRED",
      );
    }

    const { data, error } = await supabase
      .from("email_campaigns")
      .update({
        ...values,
        updated_by: user.id,
      })
      .eq("id", campaignId)
      .eq("status", "draft")
      .select(CAMPAIGN_FIELDS)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new AuthError(
        "The campaign changed while you were editing it. Refresh and try again.",
        409,
        "EMAIL_CAMPAIGN_UPDATE_CONFLICT",
      );
    }

    return successResponse(
      data,
      200,
      "Email campaign draft updated successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
