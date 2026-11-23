import { AuthError, requireRole } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import {
  createNetworkSchema,
  networkFiltersSchema,
} from "@/features/advertising/schemas/advertising.schema";

const NETWORK_FIELDS =
  "id, provider, account_label, external_account_id, publisher_id, status, last_synced_at, notes, created_at, updated_at";

export async function GET(request) {
  try {
    const { supabase } = await requireRole(["admin"]);
    const url = new URL(request.url);

    const result = networkFiltersSchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );

    if (!result.success) throw result.error;

    const filters = result.data;

    let query = supabase
      .from("ad_network_connections")
      .select(NETWORK_FIELDS, { count: "exact" })
      .order("updated_at", { ascending: false });

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.search) {
      const search = filters.search
        .replace(/[\\%_]/g, "\\$&")
        .replace(/[(),]/g, " ");

      query = query.or(
        `provider.ilike.%${search}%,account_label.ilike.%${search}%,external_account_id.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return successResponse({
      items: data ?? [],
      total: count ?? 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const { supabase, user } = await requireRole(["admin"]);

    assertSameOrigin(request);

    const values = await readValidatedBody(request, createNetworkSchema);

    const payload = {
      ...values,
      provider: values.provider.trim().toLowerCase(),
      external_account_id: values.external_account_id || null,
      publisher_id: values.publisher_id || null,
      notes: values.notes || null,
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from("ad_network_connections")
      .insert(payload)
      .select(NETWORK_FIELDS)
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new AuthError(
          "This provider account is already registered.",
          409,
          "NETWORK_ACCOUNT_EXISTS",
        );
      }

      throw error;
    }

    return successResponse(
      data,
      201,
      "Advertising network account created successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
