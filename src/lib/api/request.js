import "server-only";

import { AuthError } from "@/lib/auth/session";

export async function readValidatedBody(request, schema) {
  let body;

  try {
    body = await request.json();
  } catch {
    throw new AuthError(
      "The request body must contain valid JSON.",
      400,
      "INVALID_JSON",
    );
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}

export function assertSameOrigin(request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    throw new AuthError(
      "A valid request origin is required.",
      403,
      "INVALID_ORIGIN",
    );
  }

  let expectedOrigin;

  try {
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;

    expectedOrigin = configuredUrl
      ? new URL(configuredUrl).origin
      : new URL(request.url).origin;
  } catch {
    throw new AuthError(
      "The application URL is not configured correctly.",
      500,
      "APP_URL_MISCONFIGURED",
    );
  }

  if (origin !== expectedOrigin) {
    throw new AuthError(
      "This request origin is not permitted.",
      403,
      "INVALID_ORIGIN",
    );
  }
}
