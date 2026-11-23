import { AuthError, requireRole } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { updatePlacementSchema } from "@/features/advertising/schemas/advertising.schema";

const PLACEMENT_FIELDS =
  "id, name, placement_key, description, page_scope, position, format, status, dimensions, created_by, created_at, updated_at";

export async function PATCH(request, { params }) {
  try {
    const { supabase } = await requireRole(["admin", "editor"]);
    assertSameOrigin(request);

    const { placementId } = await params;

    if (
      typeof placementId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        placementId,
      )
    ) {
      throw new AuthError(
        "The placement identifier is invalid.",
        400,
        "INVALID_PLACEMENT_ID",
      );
    }

    const values = await readValidatedBody(request, updatePlacementSchema);

    const payload = {
      ...values,
      ...(values.description !== undefined
        ? { description: values.description || null }
        : {}),
    };

    const { data, error } = await supabase
      .from("ad_placements")
      .update(payload)
      .eq("id", placementId)
      .select(PLACEMENT_FIELDS)
      .maybeSingle();

    if (error?.code === "23505") {
      throw new AuthError(
        "That placement key is already in use.",
        409,
        "PLACEMENT_KEY_CONFLICT",
      );
    }

    if (error) throw error;

    if (!data) {
      throw new AuthError(
        "The ad placement was not found.",
        404,
        "PLACEMENT_NOT_FOUND",
      );
    }

    return successResponse(data, 200, "Ad placement updated successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}
