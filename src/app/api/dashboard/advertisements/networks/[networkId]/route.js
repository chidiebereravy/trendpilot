import { AuthError, requireRole } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { updateNetworkSchema } from "@/features/advertising/schemas/advertising.schema";

const NETWORK_FIELDS =
  "id, provider, account_label, external_account_id, publisher_id, status, last_synced_at, notes, created_at, updated_at";

export async function PATCH(request, { params }) {
  try {
    const { supabase } = await requireRole(["admin"]);

    assertSameOrigin(request);

    const { networkId } = await params;
    // Validate the route identifier independently of the request body.
    if (
      typeof networkId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        networkId,
      )
    ) {
      throw new AuthError(
        "The advertising network identifier is invalid.",
        400,
        "INVALID_NETWORK_ID",
      );
    }

    const values = await readValidatedBody(request, updateNetworkSchema);

    const payload = {
      ...values,
      ...(values.provider !== undefined
        ? { provider: values.provider.trim().toLowerCase() }
        : {}),
      ...(values.external_account_id !== undefined
        ? { external_account_id: values.external_account_id || null }
        : {}),
      ...(values.publisher_id !== undefined
        ? { publisher_id: values.publisher_id || null }
        : {}),
      ...(values.notes !== undefined ? { notes: values.notes || null } : {}),
    };

    const { data, error } = await supabase
      .from("ad_network_connections")
      .update(payload)
      .eq("id", networkId)
      .select(NETWORK_FIELDS)
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        throw new AuthError(
          "Another account already uses this provider and external account ID.",
          409,
          "NETWORK_ACCOUNT_EXISTS",
        );
      }

      throw error;
    }

    if (!data) {
      throw new AuthError(
        "The advertising network account was not found.",
        404,
        "NETWORK_NOT_FOUND",
      );
    }

    return successResponse(
      data,
      200,
      "Advertising network account updated successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
