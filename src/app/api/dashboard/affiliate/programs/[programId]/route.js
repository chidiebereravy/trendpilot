import { AuthError, requireRole } from "@/lib/auth/session";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { updateAffiliateProgramSchema } from "@/features/affiliate/schemas/affiliate-program.schema";

const programFields = [
  "id",
  "name",
  "slug",
  "program_type",
  "network_name",
  "website_url",
  "terms_url",
  "commission_model",
  "default_currency",
  "status",
  "notes",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
].join(", ");

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function handleDatabaseError(error) {
  if (error.code === "23505") {
    throw new AuthError(
      "A program with this name or slug already exists.",
      409,
      "AFFILIATE_PROGRAM_ALREADY_EXISTS",
    );
  }

  if (error.code === "23514") {
    throw new AuthError(
      "The program contains information that violates a database rule.",
      422,
      "AFFILIATE_PROGRAM_RULE_VIOLATION",
    );
  }

  throw error;
}

export async function PATCH(request, { params }) {
  try {
    assertSameOrigin(request);

    const { user } = await requireRole(["admin"]);
    const { programId } = await params;

    if (!uuidPattern.test(programId)) {
      throw new AuthError(
        "The affiliate program identifier is invalid.",
        400,
        "INVALID_AFFILIATE_PROGRAM_ID",
      );
    }

    const body = await readValidatedBody(request, updateAffiliateProgramSchema);

    const adminClient = createSupabaseAdminClient();

    const { data: existing, error: existingError } = await adminClient
      .from("affiliate_programs")
      .select("id")
      .eq("id", programId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (!existing) {
      throw new AuthError(
        "The affiliate program was not found.",
        404,
        "AFFILIATE_PROGRAM_NOT_FOUND",
      );
    }

    const updates = {
      ...body,
      updated_by: user.id,
    };

    const { data, error } = await adminClient
      .from("affiliate_programs")
      .update(updates)
      .eq("id", programId)
      .select(programFields)
      .single();

    if (error) handleDatabaseError(error);

    return successResponse(
      data,
      200,
      "Affiliate program updated successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
