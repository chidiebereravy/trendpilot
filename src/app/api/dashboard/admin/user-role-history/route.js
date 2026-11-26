import { z } from "zod";

import { handleUserManagementRpcError } from "@/features/users/lib/user-management-errors";
import { handleApiError, successResponse } from "@/lib/api/response";
import { AuthError, requireRole } from "@/lib/auth/session";

const filtersSchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export async function GET(request) {
  try {
    const { supabase } = await requireRole(["admin"]);
    const url = new URL(request.url);

    const parsed = filtersSchema.safeParse({
      search: url.searchParams.get("search") ?? undefined,
      limit: url.searchParams.get("limit") ?? 20,
      offset: url.searchParams.get("offset") ?? 0,
    });

    if (!parsed.success) {
      throw new AuthError(
        "The role history filters are invalid.",
        400,
        "INVALID_FILTERS",
      );
    }

    const { search, limit, offset } = parsed.data;

    const { data, error } = await supabase.rpc("admin_list_user_role_history", {
      p_search: search || null,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      handleUserManagementRpcError(error);
    }

    const history = data ?? [];

    return successResponse({
      history,
      pagination: {
        limit,
        offset,
        hasMore: history.length === limit,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
