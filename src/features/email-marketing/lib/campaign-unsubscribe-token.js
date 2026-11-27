import "server-only";

import { createHash, createHmac } from "node:crypto";

const TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60;

export async function getCampaignUnsubscribeToken(supabase, subscriberId) {
  if (!supabase || typeof subscriberId !== "string" || !subscriberId.trim()) {
    throw new Error("A valid subscriber and database client are required.");
  }

  const secret = process.env.NEWSLETTER_TOKEN_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("Newsletter token configuration is invalid.");
  }

  const token = createHmac("sha256", secret)
    .update(`trendpilot:newsletter-unsubscribe:${subscriberId}`)
    .digest("base64url");

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const expiresAt = new Date(
    Date.now() + TOKEN_TTL_SECONDS * 1000,
  ).toISOString();

  const { data: existing, error: lookupError } = await supabase
    .from("email_unsubscribe_tokens")
    .select("id, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (lookupError) {
    throw new Error("Could not verify the unsubscribe token.");
  }

  if (existing?.used_at) {
    throw new Error(
      "This subscriber's unsubscribe token has already been used.",
    );
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("email_unsubscribe_tokens")
      .update({ expires_at: expiresAt })
      .eq("id", existing.id)
      .is("used_at", null);

    if (updateError) {
      throw new Error("Could not refresh the unsubscribe token.");
    }

    return token;
  }

  const { error: insertError } = await supabase
    .from("email_unsubscribe_tokens")
    .insert({
      subscriber_id: subscriberId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

  if (!insertError) return token;

  // A concurrent request may have inserted the same deterministic token.
  if (insertError.code === "23505") {
    const { data: concurrent, error: concurrentError } = await supabase
      .from("email_unsubscribe_tokens")
      .select("id, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (!concurrentError && concurrent && !concurrent.used_at) {
      const { error: refreshError } = await supabase
        .from("email_unsubscribe_tokens")
        .update({ expires_at: expiresAt })
        .eq("id", concurrent.id)
        .is("used_at", null);

      if (!refreshError) return token;
    }
  }

  console.error("[Email Marketing] Unsubscribe token creation failed:", {
    code: insertError.code,
  });

  throw new Error("Could not create an unsubscribe token.");
}
