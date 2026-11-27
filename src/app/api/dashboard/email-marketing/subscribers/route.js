import { emailSubscriberFiltersSchema } from "@/features/email-marketing/schemas/email-subscriber-filters.schema";
import { requireRole } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";

export async function GET(request) {
  try {
    const { supabase } = await requireRole(["admin"]);

    const params = Object.fromEntries(
      new URL(request.url).searchParams.entries(),
    );

    const parsed = emailSubscriberFiltersSchema.safeParse(params);

    if (!parsed.success) {
      return handleApiError(parsed.error);
    }

    const { search, status, page, pageSize } = parsed.data;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("email_subscribers")
      .select(
        [
          "id",
          "email",
          "display_name",
          "status",
          "consent_source",
          "consent_at",
          "confirmed_at",
          "unsubscribed_at",
          "created_at",
          "updated_at",
        ].join(", "),
        { count: "exact" },
      );

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      const safeSearch = search.replace(/[\\%_]/g, "\\$&");
      query = query.ilike("email", `%${safeSearch}%`);
    }

    const {
      data: subscribers,
      count,
      error,
    } = await query.order("created_at", { ascending: false }).range(from, to);

    if (error) {
      console.error("[Email Marketing] Subscriber list failed:", error.code);
      throw new Error("Could not load newsletter subscribers.");
    }

    return successResponse({
      items: subscribers ?? [],
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
