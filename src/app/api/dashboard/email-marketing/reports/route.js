import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError, successResponse } from "@/lib/api/response";
import { emailReportFiltersSchema } from "@/features/email-marketing/schemas/email-report.schema";

export async function GET(request) {
  try {
    await requireRole(["admin"]);

    const { searchParams } = new URL(request.url);

    const parsed = emailReportFiltersSchema.safeParse({
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      page: searchParams.get("page") || 1,
      pageSize: searchParams.get("pageSize") || 20,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid report filters.",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { from, to, page, pageSize } = parsed.data;
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase.rpc(
      "admin_get_email_campaign_report",
      {
        p_from: from ?? null,
        p_to: to ?? null,
        p_limit: pageSize,
        p_offset: (page - 1) * pageSize,
      },
    );

    if (error) {
      console.error("Email campaign report failed:", error.code);
      throw new Error("Unable to load email campaign reports.");
    }

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
