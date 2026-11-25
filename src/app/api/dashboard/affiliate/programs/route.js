import { AuthError, requireRole } from "@/lib/auth/session";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import {
  affiliateProgramFiltersSchema,
  createAffiliateProgramSchema,
} from "@/features/affiliate/schemas/affiliate-program.schema";

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
  "description",
  "commission_details",
  "eligibility_details",
  "cover_image_id",
  "cover_image:media_assets!affiliate_programs_cover_image_id_fkey(id, bucket_id, object_path, original_filename, alt_text, caption)",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
].join(", ");

function attachCoverImagePreview(program, adminClient) {
  if (!program.cover_image) {
    return {
      ...program,
      cover_image: null,
    };
  }

  const { data } = adminClient.storage
    .from(program.cover_image.bucket_id)
    .getPublicUrl(program.cover_image.object_path);

  return {
    ...program,
    cover_image: {
      ...program.cover_image,
      preview_url: data.publicUrl,
    },
  };
}

function addCoverImagePreview(adminClient, program) {
  if (!program?.cover_image) {
    return {
      ...program,
      cover_image: null,
    };
  }

  const coverImage = program.cover_image;
  const { data } = adminClient.storage
    .from(coverImage.bucket_id)
    .getPublicUrl(coverImage.object_path);

  return {
    ...program,
    cover_image: {
      ...coverImage,
      preview_url: data.publicUrl,
    },
  };
}

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

  if (error.code === "23503") {
    throw new AuthError(
      "A referenced account or media asset is no longer available.",
      409,
      "AFFILIATE_PROGRAM_REFERENCE_INVALID",
    );
  }

  throw error;
}

export async function GET(request) {
  try {
    const { profile } = await requireRole(["admin", "editor"]);
    const adminClient = createSupabaseAdminClient();

    const searchParams = Object.fromEntries(
      new URL(request.url).searchParams.entries(),
    );

    const parsed = affiliateProgramFiltersSchema.safeParse(searchParams);

    if (!parsed.success) {
      throw parsed.error;
    }

    const { status, programType, search, page, pageSize } = parsed.data;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = adminClient
      .from("affiliate_programs")
      .select(programFields, { count: "exact" })
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);

    // Editors can only see active programs.
    if (profile.role !== "admin") {
      query = query.eq("status", "active");
    } else if (status) {
      query = query.eq("status", status);
    }

    if (programType) {
      query = query.eq("program_type", programType);
    }

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return successResponse({
      items: (data || []).map((program) =>
        attachCoverImagePreview(program, adminClient),
      ),
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const { user } = await requireRole(["admin"]);
    const body = await readValidatedBody(request, createAffiliateProgramSchema);

    const adminClient = createSupabaseAdminClient();

    const { data, error } = await adminClient
      .from("affiliate_programs")
      .insert({
        ...body,
        network_name: body.network_name ?? null,
        website_url: body.website_url ?? null,
        terms_url: body.terms_url ?? null,
        notes: body.notes ?? null,
        description: body.description ?? null,
        commission_details: body.commission_details ?? null,
        eligibility_details: body.eligibility_details ?? null,
        cover_image_id: body.cover_image_id ?? null,
        created_by: user.id,
        updated_by: user.id,
      })
      .select(programFields)
      .single();

    if (error) handleDatabaseError(error);

    return successResponse(
      attachCoverImagePreview(data, adminClient),
      201,
      "Affiliate campaign created successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
