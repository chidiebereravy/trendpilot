"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

import {
  getAnalyticsConsent,
  getServerAnalyticsConsent,
  subscribeToAnalyticsConsent,
} from "@/lib/analytics/consent";

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const analyticsConsent = useSyncExternalStore(
    subscribeToAnalyticsConsent,
    getAnalyticsConsent,
    getServerAnalyticsConsent,
  );

  const [scriptReady, setScriptReady] = useState(false);

  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const isValidMeasurementId = /^G-[A-Z0-9]+$/i.test(measurementId || "");

  const queryString = searchParams.toString();

  useEffect(() => {
    if (
      !scriptReady ||
      typeof window.gtag !== "function" ||
      analyticsConsent === null
    ) {
      return;
    }

    window.gtag("consent", "update", {
      analytics_storage: analyticsConsent ? "granted" : "denied",
    });
  }, [analyticsConsent, scriptReady]);

  useEffect(() => {
    if (
      analyticsConsent !== true ||
      !isValidMeasurementId ||
      !scriptReady ||
      typeof window.gtag !== "function"
    ) {
      return;
    }

    const pagePath = `${pathname}${queryString ? `?${queryString}` : ""}`;

    window.gtag("event", "page_view", {
      page_location: `${window.location.origin}${pagePath}`,
      page_path: pagePath,
      page_title: document.title,
    });
  }, [
    analyticsConsent,
    isValidMeasurementId,
    pathname,
    queryString,
    scriptReady,
  ]);

  if (analyticsConsent !== true || !isValidMeasurementId) {
    return null;
  }

  return (
    <>
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          window.gtag = function() {
            window.dataLayer.push(arguments);
          };
          window.gtag("consent", "default", {
            analytics_storage: "denied"
          });
          window.gtag("consent", "update", {
            analytics_storage: "granted"
          });
          window.gtag("js", new Date());
          window.gtag("config", "${measurementId}", {
            send_page_view: false
          });
        `}
      </Script>

      <Script
        id="google-analytics"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
    </>
  );
}
