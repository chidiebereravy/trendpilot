"use client";

import { useState } from "react";
import { useAdminEditorInvitations } from "@/features/users/queries/editor-invitation.queries";
import {
  useCreateEditorInvitation,
  useRevokeEditorInvitation,
} from "@/features/users/mutations/editor-invitation.mutations";

const PAGE_SIZE = 20;

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "revoked", label: "Revoked" },
  { value: "expired", label: "Expired" },
  { value: "all", label: "All invitations" },
];

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.error?.message || error?.message || fallback;
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700",
    accepted: "bg-emerald-50 text-emerald-700",
    revoked: "bg-slate-100 text-slate-600",
    expired: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

export default function EditorInvitationsManager() {
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [offset, setOffset] = useState(0);

  const filters = {
    status,
    search: search.trim() || undefined,
    limit: PAGE_SIZE,
    offset,
  };

  const invitationsQuery = useAdminEditorInvitations(filters);
  const createMutation = useCreateEditorInvitation();
  const revokeMutation = useRevokeEditorInvitation();

  const invitations = invitationsQuery.data?.invitations ?? [];
  const hasMore = invitationsQuery.data?.pagination?.hasMore ?? false;

  async function handleCreate(event) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) return;

    try {
      await createMutation.mutateAsync({ email: normalizedEmail });
      setEmail("");
      setStatus("pending");
      setSearch("");
      setOffset(0);
    } catch {
      // The mutation error is displayed below the form.
    }
  }

  async function handleRevoke(invitationId) {
    try {
      await revokeMutation.mutateAsync(invitationId);
    } catch {
      // The mutation error is displayed above the list.
    }
  }

  function changeStatus(value) {
    setStatus(value);
    setOffset(0);
  }

  function changeSearch(value) {
    setSearch(value);
    setOffset(0);
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#14243d]">
          Editor invitations
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Invite people to join TrendPilot as editors and manage their
          invitations.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <h3 className="text-sm font-semibold text-[#14243d]">
          Invite an editor
        </h3>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter the person's email address"
            maxLength={320}
            required
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm transition outline-none focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/15"
          />

          <button
            type="submit"
            disabled={createMutation.isPending || !email.trim()}
            className="rounded-lg bg-[#14243d] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#203858] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createMutation.isPending ? "Sending..." : "Send invitation"}
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          The invitation link expires after seven days.
        </p>

        {createMutation.isSuccess && (
          <p className="mt-3 text-sm text-emerald-700">
            Invitation email sent successfully.
          </p>
        )}

        {createMutation.isError && (
          <p role="alert" className="mt-3 text-sm text-rose-600">
            {getErrorMessage(
              createMutation.error,
              "The invitation could not be sent.",
            )}
          </p>
        )}
      </form>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
            placeholder="Search invitation email"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/15"
          />

          <select
            value={status}
            onChange={(event) => changeStatus(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#b99658]"
          >
            {STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {revokeMutation.isError && (
          <p role="alert" className="text-sm text-rose-600">
            {getErrorMessage(
              revokeMutation.error,
              "The invitation could not be revoked.",
            )}
          </p>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {invitationsQuery.isPending ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Loading invitations...
            </div>
          ) : invitationsQuery.isError ? (
            <div className="p-8 text-center">
              <p className="text-sm text-rose-600">
                {getErrorMessage(
                  invitationsQuery.error,
                  "Unable to load editor invitations.",
                )}
              </p>
              <button
                type="button"
                onClick={() => invitationsQuery.refetch()}
                className="mt-3 text-sm font-medium text-[#14243d] underline"
              >
                Try again
              </button>
            </div>
          ) : invitations.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No editor invitations found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Invited by</th>
                    <th className="px-5 py-3 font-medium">Created</th>
                    <th className="px-5 py-3 font-medium">Expires</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {invitations.map((invitation) => (
                    <tr key={invitation.invitation_id}>
                      <td className="px-5 py-4 font-medium text-[#14243d]">
                        {invitation.email}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={invitation.invitation_status} />
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {invitation.invited_by_name || "Administrator"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(invitation.created_at)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(invitation.expires_at)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {invitation.invitation_status === "pending" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleRevoke(invitation.invitation_id)
                            }
                            disabled={revokeMutation.isPending}
                            className="text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        )}

                        {invitation.invitation_status === "accepted" && (
                          <span className="text-xs text-slate-400">
                            {formatDate(invitation.accepted_at)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing {invitations.length} invitation(s)
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setOffset((current) => Math.max(0, current - PAGE_SIZE))
              }
              disabled={offset === 0 || invitationsQuery.isFetching}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={() => setOffset((current) => current + PAGE_SIZE)}
              disabled={!hasMore || invitationsQuery.isFetching}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
