import "./globals.css";

import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";

export const metadata = {
  title: {
    default: "TrendPilot - Navigate Ideas. Discover Opportunities.",
    template: "%s | TrendPilot",
  },
  description:
    "Explore insightful articles, practical guides and fresh perspectives on business, technology, finance, education and lifestyle.",
  applicationName: "TrendPilot",
  keywords: [
    "TrendPilot",
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
    siteName: "TrendPilot",
    title: "TrendPilot - Navigate Ideas. Discover Opportunities.",
    description:
      "Discover useful insights, practical knowledge and fresh perspectives.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
