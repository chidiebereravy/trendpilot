"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  History,
  LoaderCircle,
  Search,
} from "lucide-react";

import { useUserRoleHistory } from "@/features/users/queries/user-role-history.queries";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 20;

const roleLabels = {
  user: "User",
  author: "Author",
  editor: "Editor",
  admin: "Administrator",
};

const sourceLabels = {
  admin: "Admin update",
  author_application: "Author application",
  editor_invitation: "Editor invitation",
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function RoleBadge({ role }) {
  const styles = {
    user: "bg-slate-100 text-slate-700",
    author: "bg-blue-50 text-blue-700",
    editor: "bg-violet-50 text-violet-700",
    admin: "bg-[#f5f1e9] text-[#876638]",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
        styles[role] || styles.user
      }`}
    >
      {roleLabels[role] || role || "Unknown"}
    </span>
  );
}

function HistorySkeleton() {
  return (
    <div className="animate-pulse divide-y divide-[#e8e9ed]">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="space-y-3 px-5 py-5">
          <div className="h-3 w-48 rounded bg-gray-200" />
          <div className="h-3 w-64 max-w-full rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

export default function UserRoleHistory() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [search, offset],
  );

  const historyQuery = useUserRoleHistory(filters);
  const history = historyQuery.data?.history ?? [];
  const pagination = historyQuery.data?.pagination;

  function applySearch(event) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setOffset(0);
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
    setOffset(0);
  }

  if (historyQuery.isPending) {
    return (
      <section className="overflow-hidden rounded-xl border border-[#e8e9ed] bg-white shadow-sm">
        <div className="border-b border-[#e8e9ed] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#172033]">
            Role change history
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            A record of account permission changes across TrendPilot.
          </p>
        </div>
        <HistorySkeleton />
      </section>
    );
  }

  if (historyQuery.isError) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
          <AlertCircle size={17} />
          We could not load role history.
        </div>
        <p className="mt-2 text-sm text-red-700">
          {getErrorMessage(historyQuery.error)}
        </p>
        <button
          type="button"
          onClick={() => historyQuery.refetch()}
          className="mt-4 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[#e8e9ed] bg-white shadow-sm">
      <div className="border-b border-[#e8e9ed] p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2">
              <History size={18} className="text-[#98743d]" />
              <h2 className="text-lg font-semibold text-[#172033]">
                Role change history
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Review who changed an account&apos;s role, when it happened, and
              the source of the change.
            </p>
          </div>

          <form
            onSubmit={applySearch}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <label className="relative block flex-1">
              <span className="sr-only">
                Search role history by user or administrator
              </span>
              <Search
                size={16}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                maxLength={100}
                placeholder="Search by user or administrator..."
                className="h-11 w-full rounded-md border border-[#e3e5e9] bg-white pr-3 pl-10 text-sm outline-none focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/10"
              />
            </label>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#14243d] px-5 text-sm font-semibold text-white hover:bg-[#203653]"
            >
              <Search size={15} />
              Search
            </button>
          </form>
        </div>
      </div>

      {historyQuery.isFetching && (
        <div className="flex items-center gap-2 border-b border-[#e8e9ed] bg-[#fafbfc] px-5 py-2 text-xs text-gray-500">
          <LoaderCircle size={13} className="animate-spin" />
          Updating role history...
        </div>
      )}

      {history.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f7f8fa] text-[#98743d]">
            <History size={23} />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-[#172033]">
            {search ? "No matching history" : "No role changes recorded"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
            {search
              ? "Try another name or email address."
              : "Role changes will appear here when account permissions are updated."}
          </p>
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="mt-4 text-sm font-semibold text-[#98743d] hover:text-[#14243d]"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#e8e9ed] bg-[#fafbfc]">
                  {[
                    "Account",
                    "Role change",
                    "Changed by",
                    "Source",
                    "Date",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-4 text-[10px] font-bold tracking-[0.12em] text-gray-500 uppercase"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#eef0f2]">
                {history.map((entry) => (
                  <tr key={entry.history_id} className="hover:bg-[#fcfcfb]">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#172033]">
                        {entry.user_name || "Unnamed account"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {entry.user_email || "Email unavailable"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <RoleBadge role={entry.previous_role} />
                        <span className="text-gray-400">→</span>
                        <RoleBadge role={entry.new_role} />
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-[#172033]">
                        {entry.changed_by_name || "System"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {entry.changed_by_email || "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-xs font-medium text-gray-600">
                        {sourceLabels[entry.change_source] ||
                          entry.change_source ||
                          "Unknown"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs text-gray-600">
                      {formatDate(entry.changed_at) || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#e8e9ed] bg-[#fcfcfb] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs text-gray-500">
              Showing {offset + 1}–{offset + history.length} records
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setOffset((current) => Math.max(0, current - PAGE_SIZE))
                }
                disabled={offset === 0 || historyQuery.isFetching}
                className="inline-flex items-center gap-1 rounded-md border border-[#dfe2e8] bg-white px-3 py-2 text-xs font-semibold text-[#26354a] hover:border-[#b99658] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                Previous
              </button>

              <button
                type="button"
                onClick={() => setOffset((current) => current + PAGE_SIZE)}
                disabled={!pagination?.hasMore || historyQuery.isFetching}
                className="inline-flex items-center gap-1 rounded-md border border-[#dfe2e8] bg-white px-3 py-2 text-xs font-semibold text-[#26354a] hover:border-[#b99658] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
