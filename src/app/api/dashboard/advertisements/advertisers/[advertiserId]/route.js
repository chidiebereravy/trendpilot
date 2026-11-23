import { AuthError, requireRole } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { updateAdvertiserSchema } from "@/features/advertising/schemas/advertising.schema";

const ADVERTISER_FIELDS =
  "id, company_name, contact_name, contact_email, contact_phone, website_url, billing_address, tax_reference, notes, status, created_by, created_at, updated_at";

export async function PATCH(request, { params }) {
  try {
    const { supabase } = await requireRole(["admin"]);
    assertSameOrigin(request);

    const { advertiserId } = await params;

    if (
      typeof advertiserId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        advertiserId,
      )
    ) {
      throw new AuthError(
        "The advertiser identifier is invalid.",
        400,
        "INVALID_ADVERTISER_ID",
      );
    }

    const values = await readValidatedBody(request, updateAdvertiserSchema);

    const payload = {
      ...values,
      ...(values.contact_name !== undefined
        ? { contact_name: values.contact_name || null }
        : {}),
      ...(values.contact_email !== undefined
        ? { contact_email: values.contact_email?.toLowerCase() || null }
        : {}),
      ...(values.contact_phone !== undefined
        ? { contact_phone: values.contact_phone || null }
        : {}),
      ...(values.website_url !== undefined
        ? { website_url: values.website_url || null }
        : {}),
      ...(values.billing_address !== undefined
        ? { billing_address: values.billing_address || null }
        : {}),
      ...(values.tax_reference !== undefined
        ? { tax_reference: values.tax_reference || null }
        : {}),
      ...(values.notes !== undefined ? { notes: values.notes || null } : {}),
    };

    const { data, error } = await supabase
      .from("advertisers")
      .update(payload)
      .eq("id", advertiserId)
      .select(ADVERTISER_FIELDS)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new AuthError(
        "The advertiser was not found.",
        404,
        "ADVERTISER_NOT_FOUND",
      );
    }

    return successResponse(data, 200, "Advertiser updated successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}
