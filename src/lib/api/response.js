import { NextResponse } from "next/server";

export function successResponse(data, status = 200, message = "Success") {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}

export function errorResponse(
  message = "An unexpected error occurred.",
  status = 500,
  code = "INTERNAL_SERVER_ERROR",
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}

export function validationErrorResponse(error) {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check the submitted information.",
        issues,
      },
    },
    {
      status: 422,
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}

export function handleApiError(error) {
  if (Array.isArray(error?.issues)) {
    return validationErrorResponse(error);
  }

  if (
    error &&
    typeof error.status === "number" &&
    typeof error.code === "string"
  ) {
    return errorResponse(error.message, error.status, error.code);
  }

  return errorResponse();
}
