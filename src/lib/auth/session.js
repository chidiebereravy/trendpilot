import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export class AuthError extends Error {
  constructor(message, status = 401, code = "UNAUTHORIZED") {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.code = code;
  }
}

export async function requireAuthContext({ allowedRoles } = {}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AuthError(
      "You must be signed in to access this resource.",
      401,
      "UNAUTHENTICATED",
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new AuthError(
      "Your account could not be verified.",
      500,
      "PROFILE_LOOKUP_FAILED",
    );
  }

  if (!profile) {
    throw new AuthError(
      "Your account profile is unavailable.",
      403,
      "PROFILE_NOT_FOUND",
    );
  }

  if (allowedRoles?.length && !allowedRoles.includes(profile.role)) {
    throw new AuthError(
      "You do not have permission to perform this action.",
      403,
      "FORBIDDEN",
    );
  }

  return {
    supabase,
    user,
    profile,
  };
}

export async function requireAuthenticatedUser() {
  return requireAuthContext();
}

export async function requireRole(allowedRoles) {
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    throw new Error("At least one permitted role must be specified.");
  }

  return requireAuthContext({ allowedRoles });
}
