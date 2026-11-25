import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SECONDS = 24 * 60 * 60;

function getTokenSecret() {
  const secret = process.env.NEWSLETTER_TOKEN_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("Newsletter token secret is missing or invalid.");
  }

  return secret;
}

function sign(value) {
  return createHmac("sha256", getTokenSecret())
    .update(value)
    .digest("base64url");
}

export function createConfirmationToken(subscriberId) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: subscriberId,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    }),
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function verifyConfirmationToken(token) {
  if (typeof token !== "string" || token.length > 2048) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [payload, signature] = parts;

  if (!payload || !signature) {
    return null;
  }

  try {
    const expectedSignature = sign(payload);
    const received = Buffer.from(signature, "base64url");
    const expected = Buffer.from(expectedSignature, "base64url");

    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );

    if (
      typeof decoded.sub !== "string" ||
      typeof decoded.exp !== "number" ||
      !Number.isInteger(decoded.exp) ||
      decoded.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return {
      subscriberId: decoded.sub,
    };
  } catch {
    return null;
  }
}
