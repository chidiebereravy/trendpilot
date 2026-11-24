import { AuthError, requireAuthContext } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { updateProfileSchema } from "@/features/profile/schemas/profile.schema";

function toApiProfile(user, profile) {
  return {
    id: user.id,
    displayName: profile.display_name,
    email: user.email,
    emailConfirmedAt: user.email_confirmed_at,
    role: profile.role,
    createdAt: user.created_at,
    updatedAt: profile.updated_at,
  };
}

export async function GET() {
  try {
    const { user, profile } = await requireAuthContext();

    return successResponse(
      toApiProfile(user, profile),
      200,
      "Profile loaded successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request) {
  try {
    assertSameOrigin(request);

    const { user } = await requireAuthContext();
    const body = await readValidatedBody(request, updateProfileSchema);

    const adminClient = createSupabaseAdminClient();

    const { data, error } = await adminClient
      .from("profiles")
      .update({
        display_name: body.displayName,
      })
      .eq("id", user.id)
      .select("id, display_name, role, updated_at")
      .maybeSingle();

    if (error) {
      console.error("[PROFILE UPDATE] Database update failed:", {
        code: error.code,
        message: error.message,
      });

      throw new AuthError(
        "Your profile could not be updated. Please try again.",
        500,
        "PROFILE_UPDATE_FAILED",
      );
    }

    if (!data) {
      throw new AuthError(
        "Your account profile could not be found.",
        404,
        "PROFILE_NOT_FOUND",
      );
    }

    return successResponse(
      {
        id: data.id,
        displayName: data.display_name,
        role: data.role,
        updatedAt: data.updated_at,
      },
      200,
      "Your profile has been updated successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
