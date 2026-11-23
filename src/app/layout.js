import "./globals.css";
import SiteChrome from "@/components/layout/SiteChrome";
import QueryProvider from "@/providers/QueryProvider";
import { getPublicSeoSettings, getSiteUrl } from "@/lib/seo-settings";

export async function generateMetadata() {
  const settings = await getPublicSeoSettings();
  const siteUrl = getSiteUrl();

  const socialImages = settings.default_social_image_url
    ? [settings.default_social_image_url]
    : undefined;

  return {
    metadataBase: new URL(siteUrl),

    title: {
      default: settings.default_title,
      template: settings.title_template,
    },

    description: settings.default_description,
    applicationName: settings.site_name,

    keywords: [
      settings.site_name,
      "business",
      "technology",
      "finance",
      "education",
      "lifestyle",
      "digital magazine",
      "insights",
      "broad niches",
      "micro niches",
    ],

    openGraph: {
      type: "website",
      siteName: settings.site_name,
      title: settings.default_title,
      description: settings.default_description,
      ...(socialImages ? { images: socialImages } : {}),
    },

    twitter: {
      card: socialImages ? "summary_large_image" : "summary",
      title: settings.default_title,
      description: settings.default_description,
      ...(socialImages ? { images: socialImages } : {}),
    },

    robots: {
      index: settings.search_indexing_enabled,
      follow: settings.search_indexing_enabled,
    },
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <QueryProvider>
          <SiteChrome>{children}</SiteChrome>
        </QueryProvider>
      </body>
    </html>
  );
}
