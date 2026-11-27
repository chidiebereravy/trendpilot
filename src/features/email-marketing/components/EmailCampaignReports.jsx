"use client";

import { useMemo, useState } from "react";

import { useEmailCampaignReport } from "../queries/email-marketing.queries";

const numberFormatter = new Intl.NumberFormat();

function formatNumber(value) {
  return numberFormatter.format(Number(value ?? 0));
}

function formatRate(value) {
  if (value === null || value === undefined) return "—";
  return `${Number(value).toFixed(2)}%`;
}

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toStartOfDay(value) {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00`).toISOString();
}

function toEndExclusive(value) {
  if (!value) return undefined;

  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);

  return date.toISOString();
}

const metricCards = [
  { key: "total_campaigns", label: "Campaigns" },
  { key: "total_recipients", label: "Recipients" },
  { key: "sent", label: "Sent" },
  { key: "delivered", label: "Delivered" },
  { key: "opened", label: "Opened" },
  { key: "clicked", label: "Clicked" },
  { key: "bounced", label: "Bounced" },
  { key: "complained", label: "Complaints" },
  { key: "failed", label: "Failed" },
  { key: "uncertain", label: "Uncertain" },
  { key: "suppressed", label: "Suppressed" },
  { key: "pending", label: "Pending" },
];

export default function EmailCampaignReports() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filters = useMemo(
    () => ({
      from: toStartOfDay(fromDate),
      to: toEndExclusive(toDate),
      page,
      pageSize,
    }),
    [fromDate, toDate, page],
  );

  const { data, isPending, isError, error, refetch, isFetching } =
    useEmailCampaignReport(filters);

  const summary = data?.summary;
  const campaigns = data?.campaigns ?? [];
  const total = Number(data?.pagination?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function updateFromDate(value) {
    setFromDate(value);
    setPage(1);
  }

  function updateToDate(value) {
    setToDate(value);
    setPage(1);
  }

  function clearFilters() {
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  if (isPending) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#c4a16a]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="font-medium text-red-800">
          Unable to load campaign reports.
        </p>
        <p className="mt-1 text-sm text-red-700">
          {error?.response?.data?.message ||
            error?.message ||
            "Please try again."}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Campaign performance
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Delivery and engagement metrics for your email campaigns.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium text-slate-600">
            From
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => updateFromDate(event.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-medium text-slate-600">
            To
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => updateToDate(event.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!fromDate && !toDate}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      {isFetching && <p className="text-xs text-slate-500">Updating report…</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {metricCards.map((metric) => (
          <div
            key={metric.key}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <p className="text-xs font-medium text-slate-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
              {formatNumber(summary?.[metric.key])}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Delivery rate</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatRate(summary?.delivery_rate)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Delivered ÷ sent</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Open rate</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatRate(summary?.open_rate)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Opened ÷ delivered</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Click rate</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatRate(summary?.click_rate)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Clicked ÷ delivered</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          <h3 className="font-semibold text-slate-900">Campaign breakdown</h3>
          <p className="mt-1 text-sm text-slate-500">
            {formatNumber(total)} campaigns in this report.
          </p>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-slate-700">No campaigns found</p>
            <p className="mt-1 text-sm text-slate-500">
              Campaign activity will appear here when campaigns are created.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Recipients</th>
                  <th className="px-4 py-3">Sent</th>
                  <th className="px-4 py-3">Delivered</th>
                  <th className="px-4 py-3">Opened</th>
                  <th className="px-4 py-3">Clicked</th>
                  <th className="px-4 py-3">Bounced</th>
                  <th className="px-4 py-3">Complaints</th>
                  <th className="px-4 py-3">Failed</th>
                  <th className="px-4 py-3">Uncertain</th>
                  <th className="px-4 py-3">Delivery rate</th>
                  <th className="px-4 py-3">Open rate</th>
                  <th className="px-4 py-3">Click rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="text-slate-700">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {campaign.name}
                      </p>
                      <p className="mt-1 max-w-56 truncate text-xs text-slate-500">
                        {campaign.subject}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(campaign.created_at)}
                      </p>
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {campaign.status?.replaceAll("_", " ") || "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatNumber(campaign.total_recipients)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatNumber(campaign.sent)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatNumber(campaign.delivered)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatNumber(campaign.opened)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatNumber(campaign.clicked)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatNumber(campaign.bounced)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatNumber(campaign.complained)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatNumber(campaign.failed)}
                    </td>
                    <td className="px-4 py-3 font-medium text-amber-700 tabular-nums">
                      {formatNumber(campaign.uncertain)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatRate(campaign.delivery_rate)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatRate(campaign.open_rate)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatRate(campaign.click_rate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
