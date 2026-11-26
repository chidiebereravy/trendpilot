import { submitAuthorApplicationSchema } from "@/features/users/schemas/author-application.schema";
import { handleUserManagementRpcError } from "@/features/users/lib/user-management-errors";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";
import { requireAuthenticatedUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();

    const { data, error } = await supabase
      .from("author_applications")
      .select("id, status, review_note, submitted_at, reviewed_at")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return successResponse({
      application: data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const { supabase } = await requireAuthenticatedUser();
    const body = await readValidatedBody(
      request,
      submitAuthorApplicationSchema,
    );

    const { data, error } = await supabase.rpc("submit_author_application", {
      p_motivation: body.motivation,
      p_experience: body.experience,
      p_portfolio_url: body.portfolioUrl,
    });

    if (error) {
      handleUserManagementRpcError(error, {
        conflictMessage: "You already have a pending author application.",
        forbiddenMessage:
          "You must be signed in to submit an author application.",
      });
    }

    return successResponse(
      data,
      201,
      "Your author application has been submitted.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
