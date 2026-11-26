import { randomBytes, createHash } from "node:crypto";
import { Resend } from "resend";

import { requireRole } from "@/lib/auth/session";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import {
  errorResponse,
  handleApiError,
  successResponse,
  validationErrorResponse,
} from "@/lib/api/response";

import {
  createEditorInvitationSchema,
  editorInvitationFiltersSchema,
} from "@/features/users/schemas/editor-invitation.schema";

import { handleUserManagementRpcError } from "@/features/users/lib/user-management-errors";

const INVITATION_LIFETIME_DAYS = 7;

async function revokeInvitationAfterEmailFailure(supabase, invitationId) {
  const { error } = await supabase.rpc("admin_revoke_editor_invitation", {
    p_invitation_id: invitationId,
  });

  if (error) {
    console.error(
      "Failed to revoke an invitation after email delivery failed.",
      {
        invitationId,
        code: error.code,
      },
    );
  }
}

function getApplicationUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL;

  if (!value) {
    throw new Error("Application URL is not configured.");
  }

  const url = new URL(value);

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error("Application URL configuration is invalid.");
  }

  return url;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function GET(request) {
  try {
    const { supabase } = await requireRole(["admin"]);
    const url = new URL(request.url);

    const parsed = editorInvitationFiltersSchema.safeParse({
      status: url.searchParams.get("status") ?? "pending",
      search: url.searchParams.get("search") ?? undefined,
      limit: url.searchParams.get("limit") ?? 20,
      offset: url.searchParams.get("offset") ?? 0,
    });

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const { status, search, limit, offset } = parsed.data;

    const { data, error } = await supabase.rpc(
      "admin_list_editor_invitations",
      {
        p_status: status,
        p_search: search || null,
        p_limit: limit,
        p_offset: offset,
      },
    );

    if (error) {
      handleUserManagementRpcError(error);
    }

    const invitations = data ?? [];

    return successResponse({
      invitations,
      pagination: {
        limit,
        offset,
        hasMore: invitations.length === limit,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const { supabase } = await requireRole(["admin"]);
    const body = await readValidatedBody(request, createEditorInvitationSchema);

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return errorResponse("Invitation email delivery is not configured.", 503);
    }

    const appUrl = getApplicationUrl();

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    const expiresAt = new Date(
      Date.now() + INVITATION_LIFETIME_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: invitation, error: createError } = await supabase.rpc(
      "admin_create_editor_invitation",
      {
        p_email: body.email,
        p_token_hash: tokenHash,
        p_expires_at: expiresAt,
      },
    );

    if (createError) {
      handleUserManagementRpcError(createError);
    }

    const invitationId =
      invitation?.invitationId ?? invitation?.invitation_id ?? invitation?.id;

    if (!invitationId) {
      throw new Error("The invitation could not be created.");
    }

    const invitationUrl = new URL("/auth/invitation", appUrl);
    invitationUrl.searchParams.set("token", rawToken);

    const safeEmail = escapeHtml(body.email);
    const resend = new Resend(process.env.RESEND_API_KEY);

    let emailError = null;

    try {
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: body.email,
        subject: "You're invited to join TrendPilot as an editor",
        text: [
          "You've been invited to join TrendPilot as an editor.",
          "",
          `Accept your invitation: ${invitationUrl.toString()}`,
          "",
          "This invitation expires in seven days.",
          "Sign in or register using this invited email address, then accept the invitation.",
          "If you were not expecting this invitation, you can ignore this email.",
        ].join("\n"),
        html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#14243d">
          <h2>You're invited to TrendPilot</h2>
          <p>An administrator has invited <strong>${safeEmail}</strong> to join TrendPilot as an editor.</p>
          <p>
            <a href="${invitationUrl.toString()}"
               style="display:inline-block;padding:12px 20px;background:#14243d;color:#ffffff;text-decoration:none;border-radius:6px">
              Accept invitation
            </a>
          </p>
          <p>This invitation expires in seven days. Sign in or register using the invited email address before accepting.</p>
          <p>If you were not expecting this invitation, you can ignore this email.</p>
        </div>
      `,
      });

      emailError = result.error;
    } catch (error) {
      console.error("Editor invitation email delivery failed.", {
        invitationId,
        message: error instanceof Error ? error.message : "Unknown email error",
      });

      emailError = error;
    }

    if (emailError) {
      await revokeInvitationAfterEmailFailure(supabase, invitationId);

      return errorResponse(
        "The invitation email could not be sent. Please try again.",
        502,
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
