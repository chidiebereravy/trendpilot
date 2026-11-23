import { requireAuthenticatedUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";

export async function GET() {
  try {
    const { user, profile } = await requireAuthenticatedUser();

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        emailConfirmedAt: user.email_confirmed_at,
      },
      profile: {
        id: profile.id,
        displayName: profile.display_name,
        role: profile.role,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
