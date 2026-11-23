import { requireRole, AuthError } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import {
  categoryIdSchema,
  updateCategorySchema,
} from "@/features/categories/schemas/category.schema";

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

async function getCategory(supabase, categoryId) {
  const { data, error } = await supabase
    .from("categories")
    .select("id, level")
    .eq("id", categoryId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new AuthError(
      "The requested category was not found.",
      404,
      "CATEGORY_NOT_FOUND",
    );
  }

  return data;
}

export async function PATCH(request, { params }) {
  try {
    assertSameOrigin(request);

    const { supabase } = await requireRole(["admin"]);
    const { categoryId } = await params;

    const idResult = categoryIdSchema.safeParse(categoryId);

    if (!idResult.success) {
      throw new AuthError(
        "The category identifier is invalid.",
        400,
        "INVALID_CATEGORY_ID",
      );
    }

    const body = await readValidatedBody(request, updateCategorySchema);

    const category = await getCategory(supabase, categoryId);

    if (
      category.level === "broad" &&
      (body.name !== undefined || body.slug !== undefined)
    ) {
      throw new AuthError(
        "The identity of an official Broad Niche cannot be changed.",
        403,
        "BROAD_NICHE_IDENTITY_PROTECTED",
      );
    }

    const updates = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.slug !== undefined) updates.slug = body.slug;
    if (body.description !== undefined) {
      updates.description = body.description;
    }
    if (body.status !== undefined) updates.status = body.status;
    if (body.seoTitle !== undefined) updates.seo_title = body.seoTitle;
    if (body.seoDescription !== undefined) {
      updates.seo_description = body.seoDescription;
    }
    if (body.displayOrder !== undefined) {
      updates.display_order = body.displayOrder;
    }

    const { data, error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", categoryId)
      .select(categoryFields)
      .single();

    if (error) handleDatabaseError(error);

    return successResponse(data, 200, "Category updated successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    assertSameOrigin(request);

    const { supabase } = await requireRole(["admin"]);
    const { categoryId } = await params;

    const idResult = categoryIdSchema.safeParse(categoryId);

    if (!idResult.success) {
      throw new AuthError(
        "The category identifier is invalid.",
        400,
        "INVALID_CATEGORY_ID",
      );
    }

    const category = await getCategory(supabase, categoryId);

    if (category.level === "broad") {
      throw new AuthError(
        "The six official Broad Niches cannot be deleted.",
        403,
        "BROAD_NICHE_PROTECTED",
      );
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (error) handleDatabaseError(error);

    return successResponse(null, 200, "Category deleted successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}
