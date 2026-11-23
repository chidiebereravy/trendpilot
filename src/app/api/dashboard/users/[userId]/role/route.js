import {
  updateUserRoleSchema,
  userIdSchema,
} from "@/features/users/schemas/user.schema";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";
import { AuthError, requireRole } from "@/lib/auth/session";

function handleRoleUpdateError(error) {
  if (error.code === "42501") {
    throw new AuthError(
      "You do not have permission to change this account role.",
      403,
      "ROLE_UPDATE_FORBIDDEN",
    );
  }

  if (error.code === "22023") {
    throw new AuthError(
      error.message || "The selected role is invalid.",
      400,
      "INVALID_USER_ROLE",
    );
  }

  if (error.code === "P0001") {
    throw new AuthError(
      error.message || "This role change is not permitted.",
      409,
      "ROLE_UPDATE_CONFLICT",
    );
  }

  if (error.code === "P0002") {
    throw new AuthError(
      "The requested user was not found.",
      404,
      "USER_NOT_FOUND",
    );
  }

  throw error;
}

export async function PATCH(request, { params }) {
  try {
    assertSameOrigin(request);

    const { supabase } = await requireRole(["admin"]);
    const { userId } = await params;

    const idResult = userIdSchema.safeParse(userId);

    if (!idResult.success) {
      throw new AuthError(
        "The user identifier is invalid.",
        400,
        "INVALID_USER_ID",
      );
    }

    const body = await readValidatedBody(request, updateUserRoleSchema);

    const { data, error } = await supabase.rpc("admin_update_user_role", {
      p_user_id: userId,
      p_new_role: body.role,
    });

    if (error) {
      handleRoleUpdateError(error);
    }

    return successResponse(
      {
        userId,
        role: data,
      },
      200,
      "User role updated successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
