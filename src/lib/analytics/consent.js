const CONSENT_COOKIE = "trendpilot_analytics_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;
const CONSENT_EVENT = "trendpilot-consent-change";

export function getAnalyticsConsent() {
  if (typeof document === "undefined") return null;

  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`));

  if (!entry) return null;

  const value = entry.split("=")[1];

  if (value === "granted") return true;
  if (value === "denied") return false;

  return null;
}

export function subscribeToAnalyticsConsent(callback) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(CONSENT_EVENT, callback);

  return () => window.removeEventListener(CONSENT_EVENT, callback);
}

export function getServerAnalyticsConsent() {
  return null;
}

export function saveAnalyticsConsent(accepted) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const value = accepted ? "granted" : "denied";
  const secure = window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax${secure}`;

  window.dispatchEvent(new Event(CONSENT_EVENT));
}
