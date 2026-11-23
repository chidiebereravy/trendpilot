import { randomBytes } from "node:crypto";

import {
  affiliateLinkFiltersSchema,
  createAffiliateLinkSchema,
} from "@/features/affiliate/schemas/affiliate-link.schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";

const LINK_FIELDS = `
  id,
  program_id,
  title,
  description,
  destination_url,
  tracking_code,
  status,
  approved_by,
  approved_at,
  expires_at,
  created_by,
  updated_by,
  created_at,
  updated_at,
  program:affiliate_programs (
    id,
    name,
    slug,
    program_type,
    status
  )
`;

function jsonError(message, status, code) {
  return Response.json(
    {
      success: false,
      message,
      error: { code, message },
    },
    {
      status,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

function sanitizeSearch(value) {
  return value
    .replace(/[,.()%_*\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export async function GET(request) {
  try {
    const {
      user,
      profile: { role },
    } = await requireRole(["admin", "editor"]);
    const url = new URL(request.url);

    const filters = affiliateLinkFiltersSchema.parse({
      search: url.searchParams.get("search") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      programId: url.searchParams.get("programId") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });

    const supabase = createSupabaseAdminClient();
    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;

    let query = supabase
      .from("affiliate_links")
      .select(LINK_FIELDS, { count: "exact" })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);

    if (role !== "admin") {
      query = query.eq("created_by", user.id);
    }

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.programId) {
      query = query.eq("program_id", filters.programId);
    }

    const search = filters.search ? sanitizeSearch(filters.search) : "";

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const total = count ?? 0;

    return successResponse({
      items: data ?? [],
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.ceil(total / filters.pageSize),
        hasMore: to + 1 < total,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const {
      user,
      profile: { role },
    } = await requireRole(["admin", "editor"]);
    const payload = await readValidatedBody(request, createAffiliateLinkSchema);

    const supabase = createSupabaseAdminClient();

    const { data: program, error: programError } = await supabase
      .from("affiliate_programs")
      .select("id, name, status")
      .eq("id", payload.programId)
      .maybeSingle();

    if (programError) {
      throw programError;
    }

    if (!program) {
      return jsonError(
        "The selected affiliate program does not exist.",
        422,
        "AFFILIATE_PROGRAM_NOT_FOUND",
      );
    }

    if (role === "editor" && program.status !== "active") {
      return jsonError(
        "Editors can only use active affiliate programs.",
        403,
        "AFFILIATE_PROGRAM_NOT_AVAILABLE",
      );
    }

    if (role === "admin" && program.status === "archived") {
      return jsonError(
        "Archived affiliate programs cannot receive new links.",
        422,
        "AFFILIATE_PROGRAM_ARCHIVED",
      );
    }

    if (
      payload.expiresAt &&
      new Date(payload.expiresAt).getTime() <= Date.now()
    ) {
      return jsonError(
        "The expiry date must be in the future.",
        422,
        "INVALID_AFFILIATE_LINK_EXPIRY",
      );
    }

    const trackingCode = randomBytes(24).toString("base64url");

    const { data, error } = await supabase
      .from("affiliate_links")
      .insert({
        program_id: payload.programId,
        title: payload.title,
        description: payload.description ?? null,
        destination_url: payload.destinationUrl,
        tracking_code: trackingCode,
        expires_at: payload.expiresAt ?? null,
        status: payload.status,
        created_by: user.id,
        updated_by: user.id,
      })
      .select(LINK_FIELDS)
      .single();

    if (error?.code === "23505") {
      return jsonError(
        "A duplicate affiliate tracking code was generated. Please try again.",
        409,
        "AFFILIATE_TRACKING_CODE_CONFLICT",
      );
    }

    if (error) {
      throw error;
    }

    return successResponse(
      { item: data },
      201,
      "Affiliate link created successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}

