import { requireRole } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/api/request";
import {
  handleApiError,
  successResponse,
  validationErrorResponse,
} from "@/lib/api/response";

import { editorInvitationIdSchema } from "@/features/users/schemas/editor-invitation.schema";

import { handleUserManagementRpcError } from "@/features/users/lib/user-management-errors";

export async function PATCH(request, { params }) {
  try {
    assertSameOrigin(request);

    const { supabase } = await requireRole(["admin"]);
    const { invitationId } = await params;

    const parsedId = editorInvitationIdSchema.safeParse(invitationId);

    if (!parsedId.success) {
      return validationErrorResponse(parsedId.error);
    }

    const { data, error } = await supabase.rpc(
      "admin_revoke_editor_invitation",
      { p_invitation_id: parsedId.data },
    );

    if (error) {
      handleUserManagementRpcError(error);
    }

    return successResponse(data, 200, "Editor invitation revoked.");
  } catch (error) {
    return handleApiError(error);
  }
}
