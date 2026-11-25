import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";

function getFingerprintSecret() {
  const secret = process.env.NEWSLETTER_TOKEN_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("Newsletter fingerprint secret is missing or invalid.");
  }

  return secret;
}

export function getClientIp(request) {
  const forwardedIp = request.headers.get("x-real-ip")?.trim();

  if (forwardedIp && isIP(forwardedIp)) {
    return forwardedIp.toLowerCase();
  }

  // Local development fallback only. Production must have Vercel's IP header.
  if (process.env.NODE_ENV !== "production") {
    return "127.0.0.1";
  }

  return null;
}

export function createSignupFingerprint(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Cannot create a fingerprint from an empty value.");
  }

  return createHmac("sha256", getFingerprintSecret())
    .update(value.trim().toLowerCase())
    .digest("hex");
}
