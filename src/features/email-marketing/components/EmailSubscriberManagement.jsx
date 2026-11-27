"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { useEmailSubscribers } from "@/features/email-marketing/queries/email-marketing.queries";

const statuses = ["pending", "subscribed", "unsubscribed", "suppressed"];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#c4a16a] focus:ring-2 focus:ring-[#c4a16a]/15";

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

function StatusPill({ status }) {
  const styles = {
    subscribed: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    unsubscribed: "bg-slate-100 text-slate-600",
    suppressed: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "unknown"}
    </span>
  );
}

function errorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    "Could not load subscribers. Please try again."
  );
}

export default function EmailSubscriberManagement() {
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    page: 1,
    pageSize: 20,
  });

  const queryFilters = useMemo(
    () => ({
      ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      page: filters.page,
      pageSize: filters.pageSize,
    }),
    [filters],
  );

  const query = useEmailSubscribers(queryFilters);
  const subscribers = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  function changeFilter(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value,
      page: 1,
    }));
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#14243d]">
          Newsletter subscribers
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          View subscription status and consent records.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
          />
          <input
            className={`${inputClass} pl-9`}
            value={filters.search}
            onChange={(event) => changeFilter("search", event.target.value)}
            placeholder="Search subscriber email..."
            maxLength={100}
          />
        </div>

        <select
          className={`${inputClass} sm:w-52`}
          value={filters.status}
          onChange={(event) => changeFilter("status", event.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {query.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading subscribers...
        </div>
      ) : query.isError ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
        >
          {errorMessage(query.error)}
        </div>
      ) : subscribers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Users className="mx-auto text-slate-300" size={28} />
          <h3 className="mt-3 text-sm font-semibold text-slate-700">
            No subscribers found
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Subscribers who sign up will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Subscriber</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Consent source</th>
                <th className="px-4 py-3 font-semibold">Consent date</th>
                <th className="px-4 py-3 font-semibold">Confirmed</th>
                <th className="px-4 py-3 font-semibold">Unsubscribed</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">
                      {subscriber.display_name || "—"}
                    </p>
                    <p className="text-xs text-slate-500">{subscriber.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={subscriber.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {subscriber.consent_source || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {formatDate(subscriber.consent_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {formatDate(subscriber.confirmed_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {formatDate(subscriber.unsubscribed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-slate-400">
            Showing {subscribers.length} of {total} subscribers · Page{" "}
            {filters.page} of {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: Math.max(1, current.page - 1),
                }))
              }
              disabled={filters.page <= 1 || query.isFetching}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: Math.min(totalPages, current.page + 1),
                }))
              }
              disabled={filters.page >= totalPages || query.isFetching}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
