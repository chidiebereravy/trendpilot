import { AuthError, requireRole } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import {
  createPlacementSchema,
  placementFiltersSchema,
} from "@/features/advertising/schemas/advertising.schema";

const PLACEMENT_FIELDS =
  "id, name, placement_key, description, page_scope, position, format, status, dimensions, created_by, created_at, updated_at";

export async function GET(request) {
  try {
    const { supabase } = await requireRole(["admin", "editor"]);
    const url = new URL(request.url);

    const result = placementFiltersSchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );

    if (!result.success) throw result.error;

    const { status, pageScope, position, search, page, pageSize } = result.data;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("ad_placements")
      .select(PLACEMENT_FIELDS, { count: "exact" })
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);

    if (status) query = query.eq("status", status);
    if (pageScope) query = query.eq("page_scope", pageScope);
    if (position) query = query.eq("position", position);

    if (search) {
      const term = search.replace(/[\\%_]/g, "\\$&").replace(/[(),]/g, " ");
      query = query.or(
        `name.ilike.%${term}%,placement_key.ilike.%${term}%,description.ilike.%${term}%`,
      );
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const total = count ?? 0;

    return successResponse({
      items: data ?? [],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const { supabase, user } = await requireRole(["admin", "editor"]);
    assertSameOrigin(request);

    const values = await readValidatedBody(request, createPlacementSchema);

    const payload = {
      ...values,
      description: values.description || null,
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from("ad_placements")
      .insert(payload)
      .select(PLACEMENT_FIELDS)
      .single();

    if (error?.code === "23505") {
      throw new AuthError(
        "That placement key is already in use.",
        409,
        "PLACEMENT_KEY_CONFLICT",
      );
    }

    if (error) throw error;

    return successResponse(data, 201, "Ad placement created successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}
