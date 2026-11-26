import {
  authorApplicationIdSchema,
  reviewAuthorApplicationSchema,
} from "@/features/users/schemas/author-application.schema";
import { handleUserManagementRpcError } from "@/features/users/lib/user-management-errors";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";
import { AuthError, requireRole } from "@/lib/auth/session";

export async function PATCH(request, { params }) {
  try {
    assertSameOrigin(request);

    const { supabase } = await requireRole(["admin"]);
    const { applicationId } = await params;

    const idResult = authorApplicationIdSchema.safeParse(applicationId);

    if (!idResult.success) {
      throw new AuthError(
        "The application identifier is invalid.",
        400,
        "INVALID_APPLICATION_ID",
      );
    }

    const body = await readValidatedBody(
      request,
      reviewAuthorApplicationSchema,
    );

    const { data, error } = await supabase.rpc(
      "admin_review_author_application",
      {
        p_application_id: idResult.data,
        p_decision: body.decision,
        p_review_note: body.reviewNote,
      },
    );

    if (error) {
      handleUserManagementRpcError(error, {
        conflictMessage:
          "This application has already been reviewed or cannot be reviewed.",
        notFoundMessage: "The author application was not found.",
      });
    }

    return successResponse(
      data,
      200,
      `Author application ${body.decision} successfully.`,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
