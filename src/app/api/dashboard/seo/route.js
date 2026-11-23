import { AuthError, requireRole } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { updateSeoSettingsSchema } from "@/features/seo/schemas/seo.schema";

const SEO_SETTINGS_FIELDS = [
  "id",
  "site_name",
  "default_title",
  "title_template",
  "default_description",
  "default_social_image_url",
  "search_indexing_enabled",
  "sitemap_enabled",
  "include_articles",
  "include_categories",
  "updated_by",
  "created_at",
  "updated_at",
].join(", ");

const SEO_SETTINGS_COLUMN_MAP = Object.freeze({
  siteName: "site_name",
  defaultTitle: "default_title",
  titleTemplate: "title_template",
  defaultDescription: "default_description",
  defaultSocialImageUrl: "default_social_image_url",
  searchIndexingEnabled: "search_indexing_enabled",
  sitemapEnabled: "sitemap_enabled",
  includeArticles: "include_articles",
  includeCategories: "include_categories",
});

function toDatabaseSettings(values) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      const column = SEO_SETTINGS_COLUMN_MAP[key];

      if (!column) {
        throw new AuthError(
          "An unsupported SEO setting was provided.",
          400,
          "INVALID_SEO_SETTING",
        );
      }

      return [column, value];
    }),
  );
}

function toApiSettings(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    siteName: row.site_name,
    defaultTitle: row.default_title,
    titleTemplate: row.title_template,
    defaultDescription: row.default_description,
    defaultSocialImageUrl: row.default_social_image_url,
    searchIndexingEnabled: row.search_indexing_enabled,
    sitemapEnabled: row.sitemap_enabled,
    includeArticles: row.include_articles,
    includeCategories: row.include_categories,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    const { supabase } = await requireRole(["admin", "editor"]);

    const { data, error } = await supabase
      .from("seo_settings")
      .select(SEO_SETTINGS_FIELDS)
      .eq("id", 1)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new AuthError(
        "SEO settings could not be found.",
        404,
        "SEO_SETTINGS_NOT_FOUND",
      );
    }

    return successResponse(
      toApiSettings(data),
      200,
      "SEO settings loaded successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request) {
  try {
    // Prevent cross-origin settings modifications.
    assertSameOrigin(request);

    // Only administrators and editors can manage SEO settings.
    const { supabase } = await requireRole(["admin", "editor"]);

    // Parse and validate the submitted JSON.
    const values = await readValidatedBody(request, updateSeoSettingsSchema);

    // Translate the validated API fields into database column names.
    const databaseValues = toDatabaseSettings(values);

    // Update only the explicitly supplied settings.
    // Audit fields are managed by database triggers.
    const { data, error } = await supabase
      .from("seo_settings")
      .update(databaseValues)
      .eq("id", 1)
      .select(SEO_SETTINGS_FIELDS)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new AuthError(
        "SEO settings could not be found.",
        404,
        "SEO_SETTINGS_NOT_FOUND",
      );
    }

    return successResponse(
      toApiSettings(data),
      200,
      "SEO settings updated successfully.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
