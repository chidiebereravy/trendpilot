import { AuthError, requireRole } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import {
  advertiserFiltersSchema,
  createAdvertiserSchema,
} from "@/features/advertising/schemas/advertising.schema";

const ADVERTISER_FIELDS =
  "id, company_name, contact_name, contact_email, contact_phone, website_url, billing_address, tax_reference, notes, status, created_by, created_at, updated_at";

export async function GET(request) {
  try {
    const { supabase } = await requireRole(["admin"]);
    const url = new URL(request.url);

    const result = advertiserFiltersSchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );

    if (!result.success) throw result.error;

    const { status, search, page, pageSize } = result.data;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("advertisers")
      .select(ADVERTISER_FIELDS, { count: "exact" })
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      const term = search.replace(/[\\%_]/g, "\\$&").replace(/[(),]/g, " ");
      query = query.or(
        `company_name.ilike.%${term}%,contact_name.ilike.%${term}%,contact_email.ilike.%${term}%`,
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
    console.error("[GET /api/dashboard/advertisements/advertisers]", {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack,
    });

    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const { supabase, user } = await requireRole(["admin"]);
    assertSameOrigin(request);

    const values = await readValidatedBody(request, createAdvertiserSchema);

    const payload = {
      ...values,
      contact_name: values.contact_name || null,
      contact_email: values.contact_email?.toLowerCase() || null,
      contact_phone: values.contact_phone || null,
      website_url: values.website_url || null,
      billing_address: values.billing_address || null,
      tax_reference: values.tax_reference || null,
      notes: values.notes || null,
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from("advertisers")
      .insert(payload)
      .select(ADVERTISER_FIELDS)
      .single();

    if (error) throw error;

    return successResponse(data, 201, "Advertiser created successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}
