import { userDirectoryFiltersSchema } from "@/features/users/schemas/user.schema";
import {
  buildUserPage,
  decodeUserCursor,
} from "@/features/users/utils/user-pagination";
import { handleApiError, successResponse } from "@/lib/api/response";
import { AuthError, requireRole } from "@/lib/auth/session";

function serializeUser(user) {
  return {
    id: user.user_id,
    displayName: user.display_name,
    email: user.email,
    role: user.user_role,
    registeredAt: user.registered_at,
    emailConfirmedAt: user.email_confirmed_at,
    lastSignInAt: user.last_sign_in_at,
  };
}

export async function GET(request) {
  try {
    const { supabase } = await requireRole(["admin"]);

    const url = new URL(request.url);
    const rawFilters = Object.fromEntries(url.searchParams.entries());

    const filterResult = userDirectoryFiltersSchema.safeParse(rawFilters);

    if (!filterResult.success) {
      throw filterResult.error;
    }

    const filters = filterResult.data;
    const cursor = decodeUserCursor(filters.cursor);

    if (filters.cursor && !cursor) {
      throw new AuthError(
        "The user pagination cursor is invalid.",
        400,
        "INVALID_USER_CURSOR",
      );
    }

    const { data, error } = await supabase.rpc("admin_list_users", {
      p_search: filters.search || null,
      p_role: filters.role || null,
      p_cursor_created_at: cursor?.createdAt ?? null,
      p_cursor_id: cursor?.id ?? null,
      p_limit: filters.limit,
    });

    if (error) {
      throw error;
    }

    const page = buildUserPage(data ?? [], filters.limit);

    return successResponse({
      items: page.items.map(serializeUser),
      pagination: page.pagination,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
