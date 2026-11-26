import { AuthError } from "@/lib/auth/session";

export function handleUserManagementRpcError(error, options = {}) {
  if (!error) return;

  const {
    forbiddenMessage = "You do not have permission to perform this action.",
    conflictMessage = "This request conflicts with the current account state.",
    notFoundMessage = "The requested record was not found.",
    invalidMessage = "The submitted information is invalid.",
  } = options;

  if (error.code === "42501") {
    throw new AuthError(forbiddenMessage, 403, "FORBIDDEN");
  }

  if (error.code === "22023") {
    throw new AuthError(invalidMessage, 400, "INVALID_INPUT");
  }

  if (error.code === "23505" || error.code === "P0001") {
    throw new AuthError(conflictMessage, 409, "REQUEST_CONFLICT");
  }

  if (error.code === "P0002") {
    throw new AuthError(notFoundMessage, 404, "NOT_FOUND");
  }

  throw error;
}
