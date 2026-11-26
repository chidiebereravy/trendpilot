import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeAuthNextPath } from "@/lib/auth/safe-next-path";

function redirectTo(path, appUrl) {
  return NextResponse.redirect(new URL(path, appUrl));
}

function loginRedirect({ appUrl, next, verified, error }) {
  const destination = new URL("/auth/login", appUrl);

  if (next) {
    destination.searchParams.set("next", next);
  }

  if (verified) {
    destination.searchParams.set("verified", "1");
  }

  if (error) {
    destination.searchParams.set("error", error);
  }

  return NextResponse.redirect(destination);
}

export async function GET(request) {
  const url = new URL(request.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const next = getSafeAuthNextPath(url.searchParams.get("next"));

  const code = url.searchParams.get("code");
  const providerError = url.searchParams.get("error");
  const errorCode = url.searchParams.get("error_code");

  if (providerError) {
    return loginRedirect({
      appUrl,
      next,
      error:
        errorCode === "otp_expired" ? "confirmation_expired" : "confirmation",
    });
  }

  if (!code) {
    return loginRedirect({
      appUrl,
      next,
      error: "confirmation",
    });
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session || !data.user) {
      return loginRedirect({
        appUrl,
        next,
        error: "confirmation",
      });
    }

    return loginRedirect({
      appUrl,
      next,
      verified: true,
    });
  } catch {
    return loginRedirect({
      appUrl,
      next,
      error: "confirmation",
    });
  }
}
