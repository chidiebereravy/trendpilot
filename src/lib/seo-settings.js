import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const PUBLIC_SEO_SETTINGS_CACHE_TAG = "public-seo-settings";

export const DEFAULT_SEO_SETTINGS = {
  site_name: "TrendPilot",
  default_title: "TrendPilot - Navigate Ideas. Discover Opportunities.",
  title_template: "%s | TrendPilot",
  default_description:
    "Explore insightful articles, practical guides and fresh perspectives on business, technology, finance, education and lifestyle.",
  default_social_image_url: null,
  search_indexing_enabled: true,
  sitemap_enabled: true,
  include_articles: true,
  include_categories: true,
};

export function getSiteUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL;

  if (!value) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured.");
  }

  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL must be a valid absolute URL.");
  }

  if (
    url.protocol !== "https:" &&
    !(process.env.NODE_ENV !== "production" && url.protocol === "http:")
  ) {
    throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS in production.");
  }

  if (url.username || url.password) {
    throw new Error("NEXT_PUBLIC_APP_URL must not contain credentials.");
  }

  if (process.env.NODE_ENV === "production") {
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

    const isLocalHostname =
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      /^127(?:\.\d{1,3}){3}$/.test(hostname);

    if (isLocalHostname) {
      throw new Error(
        "NEXT_PUBLIC_APP_URL must use a public production hostname.",
      );
    }
  }

  return url.origin;
}

export async function getPublicSeoSettings() {
  "use cache";

  cacheLife("hours");
  cacheTag(PUBLIC_SEO_SETTINGS_CACHE_TAG);

  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("seo_settings")
      .select(
        [
          "site_name",
          "default_title",
          "title_template",
          "default_description",
          "default_social_image_url",
          "search_indexing_enabled",
          "sitemap_enabled",
          "include_articles",
          "include_categories",
        ].join(", "),
      )
      .eq("id", 1)
      .single();

    if (error) {
      throw error;
    }

    return {
      ...DEFAULT_SEO_SETTINGS,
      ...data,
    };
  } catch (error) {
    // console.error("Public SEO settings query failed:", error);

    return {
      ...DEFAULT_SEO_SETTINGS,
      search_indexing_enabled: false,
      sitemap_enabled: false,
    };
  }
}
