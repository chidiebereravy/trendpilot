import { authorDirectoryFiltersSchema } from "@/features/authors/schemas/author.schema";
import {
  buildAuthorPage,
  decodeAuthorCursor,
} from "@/features/authors/utils/author-pagination";
import { handleApiError, successResponse } from "@/lib/api/response";
import { AuthError, requireRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  try {
    await requireRole(["admin", "editor"]);

    const url = new URL(request.url);
    const rawFilters = Object.fromEntries(url.searchParams.entries());
    const filterResult = authorDirectoryFiltersSchema.safeParse(rawFilters);

    if (!filterResult.success) {
      throw filterResult.error;
    }

    const filters = filterResult.data;
    const cursor = decodeAuthorCursor(filters.cursor);

    if (filters.cursor && !cursor) {
      throw new AuthError(
        "The author pagination cursor is invalid.",
        400,
        "INVALID_AUTHOR_CURSOR",
      );
    }

    const adminSupabase = createSupabaseAdminClient();

    let query = adminSupabase
      .from("profiles")
      .select("id, display_name, role, created_at")
      .in("role", ["author", "editor", "admin"]);

    if (filters.role) {
      query = query.eq("role", filters.role);
    }

    if (filters.search) {
      query = query.ilike("display_name", `%${filters.search}%`);
    }

    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      );
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(filters.limit + 1);

    if (error) {
      throw error;
    }

    const page = buildAuthorPage(data ?? [], filters.limit);

    return successResponse({
      items: page.items.map((author) => ({
        id: author.id,
        displayName: author.display_name,
        role: author.role,
        joinedAt: author.created_at,
      })),
      pagination: page.pagination,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
