"use client";

import { useState, useSyncExternalStore } from "react";

import {
  getAnalyticsConsent,
  getServerAnalyticsConsent,
  saveAnalyticsConsent,
  subscribeToAnalyticsConsent,
} from "@/lib/analytics/consent";

export default function AnalyticsConsent() {
  const analyticsConsent = useSyncExternalStore(
    subscribeToAnalyticsConsent,
    getAnalyticsConsent,
    getServerAnalyticsConsent,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  function handleConsent(accepted) {
    saveAnalyticsConsent(accepted);
    setSettingsOpen(false);
  }

  const panelVisible = analyticsConsent === null || settingsOpen;

  return (
    <>
      {panelVisible ? (
        <section
          aria-label="Analytics privacy settings"
          aria-live="polite"
          className="fixed right-4 bottom-4 left-4 z-[100] mx-auto max-w-3xl rounded-2xl border border-[#d8d2c6] bg-white p-5 shadow-2xl sm:p-6"
        >
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-[#a78348] uppercase">
                Your privacy
              </p>

              <h2 className="mt-2 text-lg font-bold text-[#14243d]">
                Analytics preferences
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                TrendPilot uses optional analytics to understand website traffic
                and improve your experience. Analytics remain disabled unless
                you choose to allow them. You can change your preference at any
                time.
              </p>

              {analyticsConsent !== null && (
                <p className="mt-2 text-xs font-semibold text-[#98743d]">
                  Current preference:{" "}
                  {analyticsConsent
                    ? "Analytics allowed"
                    : "Analytics rejected"}
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => handleConsent(false)}
                className="cursor-pointer rounded-xl border border-[#dfe2e8] px-5 py-3 text-xs font-semibold text-[#26354a] transition hover:border-[#b99658]"
              >
                Reject analytics
              </button>

              <button
                type="button"
                onClick={() => handleConsent(true)}
                className="cursor-pointer rounded-xl bg-[#14243d] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#203653]"
              >
                Allow analytics
              </button>
            </div>

            <a
              href="/privacy-policy"
              className="text-xs font-semibold text-[#98743d] underline underline-offset-4"
            >
              Read our Privacy Policy
            </a>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="fixed bottom-4 left-4 z-[90] cursor-pointer rounded-xl border border-[#d8d2c6] bg-white px-4 py-3 text-xs font-semibold text-[#26354a] shadow-lg transition hover:border-[#b99658] hover:text-[#98743d]"
        >
          Privacy settings
        </button>
      )}
    </>
  );
}
