"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";

import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";

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
