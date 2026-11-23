import { requireRole } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { supabase, user, profile } = await requireRole([
      "author",
      "editor",
      "admin",
    ]);

    const { data: categories, error: categoryError } = await supabase
      .from("categories")
      .select("id, parent_id, name, slug, level, description")
      .eq("status", "published")
      .in("level", ["broad", "subcategory", "micro"])
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })
      .limit(1500);

    if (categoryError) {
      throw categoryError;
    }

    let authors = [
      {
        id: profile.id,
        display_name: profile.display_name,
        role: profile.role,
      },
    ];

    if (["editor", "admin"].includes(profile.role)) {
      const adminSupabase = createSupabaseAdminClient();

      const { data, error } = await adminSupabase
        .from("profiles")
        .select("id, display_name, role")
        .in("role", ["author", "editor", "admin"])
        .order("display_name", { ascending: true })
        .limit(500);

      if (error) {
        throw error;
      }

      authors = data ?? [];
    }

    return successResponse({
      categories: categories ?? [],
      authors,
      permissions: {
        canAssignAuthors: ["editor", "admin"].includes(profile.role),
        canDeleteArticles: ["editor", "admin"].includes(profile.role),
        canPublishArticles: ["editor", "admin"].includes(profile.role),
      },
      currentUserId: user.id,
      currentRole: profile.role,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
