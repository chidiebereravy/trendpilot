import { authorApplicationFiltersSchema } from "@/features/users/schemas/author-application.schema";
import { handleUserManagementRpcError } from "@/features/users/lib/user-management-errors";
import { handleApiError, successResponse } from "@/lib/api/response";
import { AuthError, requireRole } from "@/lib/auth/session";

export async function GET(request) {
  try {
    const { supabase } = await requireRole(["admin"]);
    const url = new URL(request.url);

    const filtersResult = authorApplicationFiltersSchema.safeParse({
      status: url.searchParams.get("status") ?? "pending",
      search: url.searchParams.get("search") ?? undefined,
      limit: url.searchParams.get("limit") ?? 20,
      offset: url.searchParams.get("offset") ?? 0,
    });

    if (!filtersResult.success) {
      throw new AuthError(
        "The application filters are invalid.",
        400,
        "INVALID_FILTERS",
      );
    }

    const filters = filtersResult.data;

    const { data, error } = await supabase.rpc(
      "admin_list_author_applications",
      {
        p_status: filters.status,
        p_search: filters.search || null,
        p_limit: filters.limit,
        p_offset: filters.offset,
      },
    );

    if (error) {
      handleUserManagementRpcError(error);
    }

    const applications = data ?? [];

    return successResponse({
      applications,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        hasMore: applications.length === filters.limit,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
