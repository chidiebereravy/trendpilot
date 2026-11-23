import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectTo(path, appUrl) {
  return NextResponse.redirect(new URL(path, appUrl));
}

export async function GET(request) {
  const url = new URL(request.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  const code = url.searchParams.get("code");
  const providerError = url.searchParams.get("error");
  const errorCode = url.searchParams.get("error_code");

  if (providerError) {
    const expired = errorCode === "otp_expired";

    return redirectTo(
      expired
        ? "/auth/reset-password?error=link_expired"
        : "/auth/reset-password?error=link",
      appUrl,
    );
  }

  if (!code) {
    return redirectTo("/auth/reset-password?error=link", appUrl);
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session || !data.user) {
      return redirectTo("/auth/reset-password?error=link", appUrl);
    }

    return redirectTo("/auth/reset-password", appUrl);
  } catch {
    return redirectTo("/auth/reset-password?error=link", appUrl);
  }
}
