import { requireRole, AuthError } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import {
  categoryIdSchema,
  createCategorySchema,
} from "@/features/categories/schemas/category.schema";
import { slugify } from "@/lib/utils";

const categoryFields =
  "id, parent_id, name, slug, level, status, description, seo_title, seo_description, display_order, created_by, created_at, updated_at";

function handleDatabaseError(error) {
  if (error.code === "23505") {
    throw new AuthError(
      "A category with this slug already exists under the selected parent.",
      409,
      "CATEGORY_SLUG_EXISTS",
    );
  }

  if (error.code === "23503") {
    throw new AuthError(
      "This category is referenced by existing content and cannot be removed.",
      409,
      "CATEGORY_IN_USE",
    );
  }

  if (error.code === "23514" || error.code === "P0001") {
    throw new AuthError(
      error.message || "The category violates a publishing rule.",
      422,
      "CATEGORY_RULE_VIOLATION",
    );
  }

  throw error;
}

export async function GET(request) {
  try {
    const { supabase } = await requireRole(["admin"]);
    const url = new URL(request.url);

    const status = url.searchParams.get("status");
    const level = url.searchParams.get("level");
    const parentId = url.searchParams.get("parentId");

    if (status && !["draft", "published", "archived"].includes(status)) {
      throw new AuthError(
        "Invalid category status filter.",
        400,
        "INVALID_FILTER",
      );
    }

    if (level && !["broad", "subcategory", "micro"].includes(level)) {
      throw new AuthError(
        "Invalid category level filter.",
        400,
        "INVALID_FILTER",
      );
    }

    if (parentId && !categoryIdSchema.safeParse(parentId).success) {
      throw new AuthError(
        "The parent category identifier is invalid.",
        400,
        "INVALID_PARENT_CATEGORY_ID",
      );
    }

    let query = supabase
      .from("categories")
      .select(categoryFields)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })
      .limit(500);

    if (status) query = query.eq("status", status);
    if (level) query = query.eq("level", level);
    if (parentId) query = query.eq("parent_id", parentId);

    const { data, error } = await query;

    if (error) throw error;

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const { supabase, user } = await requireRole(["admin"]);
    const body = await readValidatedBody(request, createCategorySchema);

    const { data: parent, error: parentError } = await supabase
      .from("categories")
      .select("id, level, status")
      .eq("id", body.parentId)
      .maybeSingle();

    if (parentError) throw parentError;

    if (!parent) {
      throw new AuthError(
        "The selected parent category was not found.",
        404,
        "CATEGORY_PARENT_NOT_FOUND",
      );
    }

    let level;

    if (parent.level === "broad") {
      level = "subcategory";
    } else if (parent.level === "subcategory") {
      level = "micro";
    } else {
      throw new AuthError(
        "Micro Niches cannot contain additional categories.",
        422,
        "INVALID_CATEGORY_PARENT",
      );
    }

    if (body.status === "published" && parent.status !== "published") {
      throw new AuthError(
        "Publish the parent category before publishing this category.",
        422,
        "CATEGORY_PARENT_UNPUBLISHED",
      );
    }

    const slug = body.slug || slugify(body.name);

    if (!slug) {
      throw new AuthError(
        "A valid category slug could not be generated.",
        422,
        "INVALID_CATEGORY_SLUG",
      );
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({
        parent_id: parent.id,
        name: body.name,
        slug,
        level,
        status: body.status,
        description: body.description ?? null,
        seo_title: body.seoTitle ?? null,
        seo_description: body.seoDescription ?? null,
        display_order: body.displayOrder,
        created_by: user.id,
      })
      .select(categoryFields)
      .single();

    if (error) handleDatabaseError(error);

    return successResponse(data, 201, "Category created successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}
