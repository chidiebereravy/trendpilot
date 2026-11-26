import { createHash } from "node:crypto";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";

import { acceptEditorInvitationSchema } from "@/features/users/schemas/editor-invitation.schema";
import { handleUserManagementRpcError } from "@/features/users/lib/user-management-errors";

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const { supabase } = await requireAuthenticatedUser();

    const body = await readValidatedBody(request, acceptEditorInvitationSchema);

    const tokenHash = createHash("sha256")
      .update(body.token, "utf8")
      .digest("hex");

    const { data, error } = await supabase.rpc("accept_editor_invitation", {
      p_token_hash: tokenHash,
    });

    if (error) {
      handleUserManagementRpcError(error, {
        forbiddenMessage:
          "You must sign in with the email address that received this invitation.",
        conflictMessage:
          "This invitation is no longer available. It may have expired, been revoked, or already been accepted.",
        notFoundMessage: "This invitation could not be found.",
        invalidMessage: "The invitation token is invalid.",
      });
    }

    return successResponse(
      data,
      200,
      "Your editor invitation has been accepted.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
