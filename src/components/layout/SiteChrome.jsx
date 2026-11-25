"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";

import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import AnalyticsConsent from "@/components/privacy/AnalyticsConsent";
import GoogleAnalytics from "@/components/privacy/GoogleAnalytics";

function SiteChromeContent({ children }) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");

  if (isDashboard) {
    return children;
  }

  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <AnalyticsConsent />
      <GoogleAnalytics />
    </>
  );
}

export default function SiteChrome({ children }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <SiteChromeContent>{children}</SiteChromeContent>
    </Suspense>
  );
}
