import { requireRole } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";

export async function GET() {
  try {
    const { supabase, user, profile } = await requireRole([
      "author",
      "editor",
      "admin",
    ]);

    let query = supabase
      .from("articles")
      .select("id, title, slug, author_id")
      .eq("status", "published")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("title", { ascending: true })
      .limit(500);

    if (profile.role === "author") {
      query = query.eq("author_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return successResponse({
      articles: data ?? [],
    });
  } catch (error) {
    return handleApiError(error);
  }
}
