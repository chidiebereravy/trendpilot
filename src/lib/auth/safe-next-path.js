const INVITATION_PATH_PATTERN = /^\/auth\/invitation\?token=[A-Za-z0-9_-]{43}$/;

export function getSafeAuthNextPath(value) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  if (!INVITATION_PATH_PATTERN.test(value)) {
    return null;
  }

  try {
    const parsed = new URL(value, "https://trendpilot.invalid");

    if (parsed.origin !== "https://trendpilot.invalid") {
      return null;
    }

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}
