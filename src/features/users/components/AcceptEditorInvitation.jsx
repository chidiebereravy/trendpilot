"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useAcceptEditorInvitation } from "@/features/users/mutations/editor-invitation.mutations";

function getErrorMessage(error) {
  const code = error?.response?.data?.error?.code;
  const message = error?.response?.data?.error?.message;

  if (code === "FORBIDDEN" || code === "42501") {
    return "You must sign in with the email address that received this invitation.";
  }

  return (
    message ||
    error?.message ||
    "The invitation could not be accepted. It may have expired or been revoked."
  );
}

export default function AcceptEditorInvitation({
  token,
  isAuthenticated,
  email,
}) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const acceptMutation = useAcceptEditorInvitation();

  const invitationPath = `/auth/invitation?token=${encodeURIComponent(token)}`;
  const loginUrl = `/auth/login?next=${encodeURIComponent(invitationPath)}`;
  const registerUrl = `/auth/register?next=${encodeURIComponent(invitationPath)}`;

  async function handleAccept() {
    try {
      await acceptMutation.mutateAsync(token);
      setAccepted(true);
      router.replace("/dashboard");
      router.refresh();
    } catch {
      // The mutation error is displayed below.
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold tracking-wide text-[#b99658]">
            TRENDPILOT
          </p>

          <h1 className="mt-3 text-2xl font-semibold text-[#14243d]">
            Editor invitation
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            You have been invited to join TrendPilot as an editor.
          </p>
        </div>

        {accepted ? (
          <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
            Your invitation has been accepted. Redirecting to your dashboard...
          </div>
        ) : !isAuthenticated ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              Sign in or create an account using the email address that received
              this invitation. You can accept the invitation after signing in.
            </p>

            <a
              href={loginUrl}
              className="block rounded-lg bg-[#14243d] px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-[#203858]"
            >
              Sign in to accept
            </a>

            <a
              href={registerUrl}
              className="block rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-medium text-[#14243d] transition hover:bg-slate-50"
            >
              Create an account
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Signed in as
              </p>
              <p className="mt-1 text-sm font-medium break-all text-[#14243d]">
                {email || "Your account"}
              </p>
            </div>

            <p className="text-sm leading-6 text-slate-600">
              Accepting this invitation will grant your account the editor role.
              Your account email must match the email address the invitation was
              sent to.
            </p>

            <button
              type="button"
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
              className="w-full rounded-lg bg-[#14243d] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#203858] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {acceptMutation.isPending
                ? "Accepting invitation..."
                : "Accept editor invitation"}
            </button>

            {acceptMutation.isError && (
              <p role="alert" className="text-sm leading-6 text-rose-600">
                {getErrorMessage(acceptMutation.error)}
              </p>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          If you were not expecting this invitation, you can safely leave this
          page.
        </p>
      </section>
    </main>
  );
}
