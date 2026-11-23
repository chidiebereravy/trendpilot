import { getPublicSeoSettings, getSiteUrl } from "@/lib/seo-settings";

export default async function robots() {
  const settings = await getPublicSeoSettings();
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/auth/", "/api/"],
    },
    ...(settings.search_indexing_enabled && settings.sitemap_enabled
      ? { sitemap: `${siteUrl}/sitemap.xml` }
      : {}),
  };
}
