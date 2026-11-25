import "server-only";

import { createHash, randomBytes } from "node:crypto";

const UNSUBSCRIBE_TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60;

export async function createUnsubscribeToken(supabase, subscriberId) {
  if (!supabase || typeof subscriberId !== "string" || !subscriberId.trim()) {
    throw new Error("A valid subscriber and database client are required.");
  }

  const token = randomBytes(32).toString("base64url");

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const expiresAt = new Date(
    Date.now() + UNSUBSCRIBE_TOKEN_TTL_SECONDS * 1000,
  ).toISOString();

  const { error } = await supabase.from("email_unsubscribe_tokens").insert({
    subscriber_id: subscriberId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("[Newsletter] Unsubscribe token creation failed:", {
      code: error.code,
      message: error.message,
    });

    throw new Error("Could not create an unsubscribe token.");
  }

  return token;
}
