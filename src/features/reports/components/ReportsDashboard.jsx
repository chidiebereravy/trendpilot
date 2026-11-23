"use client";

import { useMemo, useState } from "react";
import {
  Download,
  FileBarChart,
  FileText,
  FolderTree,
  MessageSquare,
  RefreshCw,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
} from "lucide-react";

import { exportReport } from "@/features/reports/api/report.api";
import { useReport } from "@/features/reports/queries/report.queries";

const PAGE_SIZE = 25;

const REPORT_TYPES = [
  {
    value: "articles",
    label: "Articles",
    description: "Editorial records and publication status",
    icon: FileText,
  },
  {
    value: "discussions",
    label: "Discussions",
    description: "Comments and community contributions",
    icon: MessageSquare,
  },
  {
    value: "users",
    label: "Users",
    description: "Registered profile records",
    icon: Users,
    adminOnly: true,
  },
  {
    value: "categories",
    label: "Categories",
    description: "Broad niches, subcategories, and micro niches",
    icon: FolderTree,
    adminOnly: true,
  },
];

const STATUS_OPTIONS = {
  articles: [
    ["draft", "Draft"],
    ["in_review", "In review"],
    ["scheduled", "Scheduled"],
    ["published", "Published"],
    ["archived", "Archived"],
  ],
  discussions: [["deleted", "Deleted"]],
  categories: [
    ["draft", "Draft"],
    ["published", "Published"],
    ["archived", "Archived"],
  ],
};

const ROLE_OPTIONS = [
  ["user", "User"],
  ["author", "Author"],
  ["editor", "Editor"],
  ["admin", "Admin"],
];

const LEVEL_OPTIONS = [
  ["broad", "Broad niche"],
  ["subcategory", "Subcategory"],
  ["micro", "Micro niche"],
];

const COLUMN_CONFIG = {
  articles: [
    { key: "title", label: "Article", primary: true },
    { key: "status", label: "Status", type: "status" },
    { key: "slug", label: "Slug" },
    { key: "author_id", label: "Author ID", compact: true },
    { key: "created_at", label: "Created", type: "date" },
    { key: "published_at", label: "Published", type: "date" },
  ],
  discussions: [
    { key: "content", label: "Comment", primary: true, type: "content" },
    { key: "article_title", label: "Article" },
    { key: "author_display_name", label: "Contributor" },
    { key: "created_at", label: "Created", type: "date" },
    { key: "deleted_at", label: "Deleted", type: "date" },
  ],
  users: [
    { key: "display_name", label: "Display name", primary: true },
    { key: "role", label: "Role", type: "role" },
    { key: "id", label: "Profile ID", compact: true },
    { key: "created_at", label: "Joined", type: "date" },
    { key: "updated_at", label: "Updated", type: "date" },
  ],
  categories: [
    { key: "name", label: "Category", primary: true },
    { key: "level", label: "Hierarchy", type: "level" },
    { key: "status", label: "Status", type: "status" },
    { key: "slug", label: "Slug" },
    { key: "display_order", label: "Order" },
    { key: "created_at", label: "Created", type: "date" },
  ],
};

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatLabel(value) {
  if (!value) return "—";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function StatusPill({ value }) {
  const styles = {
    published: "bg-emerald-50 text-emerald-700",
    draft: "bg-slate-100 text-slate-600",
    in_review: "bg-amber-50 text-amber-700",
    scheduled: "bg-blue-50 text-blue-700",
    archived: "bg-slate-100 text-slate-500",
    deleted: "bg-red-50 text-red-700",
    admin: "bg-violet-50 text-violet-700",
    editor: "bg-blue-50 text-blue-700",
    author: "bg-amber-50 text-amber-700",
    user: "bg-slate-100 text-slate-600",
    broad: "bg-[#f8f5ef] text-[#98713d]",
    subcategory: "bg-blue-50 text-blue-700",
    micro: "bg-violet-50 text-violet-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap ${styles[value] || "bg-slate-100 text-slate-600"}`}
    >
      {formatLabel(value)}
    </span>
  );
}

function TableCell({ column, record }) {
  const value = record[column.key];

  if (column.type === "date") {
    return (
      <span className="text-xs whitespace-nowrap text-slate-500">
        {formatDate(value)}
      </span>
    );
  }

  if (["status", "role", "level"].includes(column.type)) {
    return value ? <StatusPill value={value} /> : <span>—</span>;
  }

  if (column.type === "content") {
    return (
      <span
        className={`block max-w-[320px] truncate text-xs ${
          record.deleted_at ? "text-slate-400 italic" : "text-slate-700"
        }`}
        title={record.deleted_at ? "Deleted comment content is hidden" : value}
      >
        {record.deleted_at ? "Deleted comment" : value || "—"}
      </span>
    );
  }

  return (
    <span
      className={`block max-w-[240px] truncate text-xs ${
        column.primary
          ? "font-semibold text-slate-800"
          : column.compact
            ? "font-mono text-[10px] text-slate-400"
            : "text-slate-500"
      }`}
      title={value == null ? "" : String(value)}
    >
      {value == null || value === "" ? "—" : String(value)}
    </span>
  );
}

function LoadingRows() {
  return (
    <div className="animate-pulse divide-y divide-slate-100">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div key={item} className="flex items-center gap-5 px-5 py-5">
          <div className="h-3 w-1/4 rounded bg-slate-100" />
          <div className="h-3 w-1/6 rounded bg-slate-100" />
          <div className="h-3 w-1/5 rounded bg-slate-100" />
          <div className="ml-auto h-3 w-20 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ type, searching }) {
  const Icon =
    REPORT_TYPES.find((item) => item.value === type)?.icon || FileBarChart;

  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
        <Icon size={21} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-800">
        {searching ? "No matching records" : "No records to report"}
      </h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
        {searching
          ? "Try adjusting your search or filters to find the records you need."
          : "Records will appear here as your TrendPilot workspace grows."}
      </p>
    </div>
  );
}

function ErrorState({ onRetry }) {
  return (
    <div className="px-5 py-14 text-center">
      <p className="text-sm font-semibold text-slate-800">
        This report could not be loaded
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Please try again. If the problem continues, check your access and
        connection.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700"
      >
        <RefreshCw size={13} />
        Try again
      </button>
    </div>
  );
}

export default function ReportsDashboard({ role = "user" }) {
  const availableReports = useMemo(
    () => REPORT_TYPES.filter((item) => !item.adminOnly || role === "admin"),
    [role],
  );

  const [type, setType] = useState("articles");
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    role: "",
    level: "",
    dateFrom: "",
    dateTo: "",
    includeDeleted: false,
  });
  const [cursor, setCursor] = useState("");
  const [cursorHistory, setCursorHistory] = useState([]);
  const [notice, setNotice] = useState("");
  const [exporting, setExporting] = useState(false);

  const activeType =
    availableReports.find((item) => item.value === type) || availableReports[0];

  const queryFilters = useMemo(
    () => ({
      type: activeType.value,
      limit: PAGE_SIZE,
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.role ? { role: filters.role } : {}),
      ...(filters.level ? { level: filters.level } : {}),
      ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
      ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
      ...(activeType.value === "discussions"
        ? { includeDeleted: String(filters.includeDeleted) }
        : {}),
      ...(cursor ? { cursor } : {}),
    }),
    [activeType.value, filters, cursor],
  );

  const { data, isLoading, isFetching, isError, refetch } =
    useReport(queryFilters);

  const records = data?.items || [];
  const pagination = data?.pagination || {};
  const columns = COLUMN_CONFIG[activeType.value] || [];

  function resetPagination() {
    setCursor("");
    setCursorHistory([]);
  }

  function changeType(nextType) {
    setType(nextType);
    setFilters({
      search: "",
      status: "",
      role: "",
      level: "",
      dateFrom: "",
      dateTo: "",
      includeDeleted: false,
    });
    setSearchInput("");
    setNotice("");
    resetPagination();
  }

  function applyFilters(event) {
    event.preventDefault();

    setFilters((current) => ({
      ...current,
      search: searchInput.trim(),
    }));
    resetPagination();
    setNotice("");
  }

  function clearFilters() {
    setSearchInput("");
    setFilters({
      search: "",
      status: "",
      role: "",
      level: "",
      dateFrom: "",
      dateTo: "",
      includeDeleted: false,
    });
    resetPagination();
    setNotice("");
  }

  function goToNextPage() {
    if (!pagination.hasMore || !pagination.nextCursor) return;

    setCursorHistory((history) => [...history, cursor]);
    setCursor(pagination.nextCursor);
  }

  function goToPreviousPage() {
    if (!cursorHistory.length) return;

    const previous = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((history) => history.slice(0, -1));
    setCursor(previous);
  }

  async function handleExport() {
    setExporting(true);
    setNotice("");

    try {
      const exportFilters = { ...queryFilters };
      delete exportFilters.cursor;
      delete exportFilters.limit;

      const result = await exportReport(exportFilters);
      const objectUrl = window.URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      const filename = `trendpilot-${activeType.value}-report-${new Date().toISOString().slice(0, 10)}.csv`;

      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);

      const count = result.headers["x-report-exported-count"] || "0";
      const truncated = result.headers["x-report-truncated"] === "true";

      setNotice(
        truncated
          ? `Exported ${count} records. The export reached the 1,000-record limit; refine your filters to export the remaining records.`
          : `CSV export ready: ${count} records.`,
      );
    } catch {
      setNotice("The CSV export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const hasFilters = Boolean(
    filters.search ||
    filters.status ||
    filters.role ||
    filters.level ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.includeDeleted,
  );

  return (
    <div className="min-h-full bg-white px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-[#a47c43] uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c4a16a]" />
              Data & exports
            </div>
            <h1 className="text-[27px] font-semibold tracking-[-0.045em] text-slate-950 sm:text-[32px]">
              Reports
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Explore detailed workspace records, narrow results with filters,
              and export report data for further analysis.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || isLoading || isError}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Download size={15} />
            )}
            {exporting ? "Preparing CSV..." : "Export CSV"}
          </button>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {availableReports.map((report) => {
            const Icon = report.icon;
            const active = activeType.value === report.value;

            return (
              <button
                key={report.value}
                type="button"
                onClick={() => changeType(report.value)}
                aria-pressed={active}
                className={`rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-[#d9c5a5] bg-[#fbf9f5] shadow-[0_2px_12px_rgba(15,23,42,0.035)]"
                    : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      active
                        ? "bg-[#f0e8da] text-[#98713d]"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon size={17} />
                  </span>
                  {active ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#c4a16a]" />
                  ) : null}
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-900">
                  {report.label}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  {report.description}
                </p>
              </button>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.025)]">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-slate-900">
                {activeType.label} report
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Filter and review {activeType.label.toLowerCase()} records.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-[11px] text-slate-400">
              <FileBarChart size={14} />
              <span>Maximum 25 records per page</span>
            </div>
          </div>

          <form
            onSubmit={applyFilters}
            className="space-y-4 border-b border-slate-100 bg-slate-50/50 px-5 py-5 sm:px-6"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="xl:col-span-2">
                <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                  Search records
                </span>
                <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-slate-400">
                  <Search size={15} className="shrink-0 text-slate-400" />
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder={
                      activeType.value === "users"
                        ? "Search display name..."
                        : activeType.value === "discussions"
                          ? "Search comments or contributors..."
                          : activeType.value === "categories"
                            ? "Search category name or slug..."
                            : "Search article title or slug..."
                    }
                    maxLength={100}
                    className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              {STATUS_OPTIONS[activeType.value] ? (
                <label>
                  <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                    Status
                  </span>
                  <select
                    value={filters.status}
                    onChange={(event) => {
                      setFilters((current) => ({
                        ...current,
                        status: event.target.value,
                      }));
                      resetPagination();
                    }}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-slate-400"
                  >
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS[activeType.value].map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {activeType.value === "users" ? (
                <label>
                  <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                    Account role
                  </span>
                  <select
                    value={filters.role}
                    onChange={(event) => {
                      setFilters((current) => ({
                        ...current,
                        role: event.target.value,
                      }));
                      resetPagination();
                    }}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-slate-400"
                  >
                    <option value="">All roles</option>
                    {ROLE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {activeType.value === "categories" ? (
                <label>
                  <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                    Hierarchy level
                  </span>
                  <select
                    value={filters.level}
                    onChange={(event) => {
                      setFilters((current) => ({
                        ...current,
                        level: event.target.value,
                      }));
                      resetPagination();
                    }}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-slate-400"
                  >
                    <option value="">All levels</option>
                    {LEVEL_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                    <CalendarDays size={12} />
                    Created from
                  </span>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    max={filters.dateTo || undefined}
                    onChange={(event) => {
                      setFilters((current) => ({
                        ...current,
                        dateFrom: event.target.value,
                      }));
                      resetPagination();
                    }}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-slate-400"
                  />
                </label>
                <label>
                  <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                    <CalendarDays size={12} />
                    Created to
                  </span>
                  <input
                    type="date"
                    value={filters.dateTo}
                    min={filters.dateFrom || undefined}
                    onChange={(event) => {
                      setFilters((current) => ({
                        ...current,
                        dateTo: event.target.value,
                      }));
                      resetPagination();
                    }}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-slate-400"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeType.value === "discussions" ? (
                  <label className="mr-1 inline-flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={filters.includeDeleted}
                      onChange={(event) => {
                        setFilters((current) => ({
                          ...current,
                          includeDeleted: event.target.checked,
                          status: "",
                        }));
                        resetPagination();
                      }}
                      className="h-3.5 w-3.5 rounded border-slate-300 accent-slate-800"
                    />
                    Include deleted
                  </label>
                ) : null}

                {hasFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-slate-500 transition hover:bg-white hover:text-slate-900"
                  >
                    <X size={13} />
                    Clear filters
                  </button>
                ) : null}

                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-700"
                >
                  <Search size={13} />
                  Apply filters
                </button>
              </div>
            </div>
          </form>

          {notice ? (
            <div className="border-b border-slate-100 bg-[#fbf9f5] px-5 py-3 text-xs leading-5 text-[#806239] sm:px-6">
              {notice}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 sm:px-6">
            <p className="text-xs text-slate-500">
              {isLoading
                ? "Loading records..."
                : `${records.length} ${records.length === 1 ? "record" : "records"} on this page`}
            </p>
            {isFetching && !isLoading ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400">
                <RefreshCw size={11} className="animate-spin" />
                Updating
              </span>
            ) : null}
          </div>

          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading ? (
            <LoadingRows />
          ) : records.length === 0 ? (
            <EmptyState type={activeType.value} searching={hasFilters} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/70">
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        scope="col"
                        className="px-5 py-3 text-[10px] font-semibold tracking-[0.08em] text-slate-400 uppercase"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      {columns.map((column) => (
                        <td key={column.key} className="px-5 py-4 align-middle">
                          <TableCell column={column} record={record} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
            <p className="text-[11px] text-slate-400">
              Results are ordered by most recently created.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPreviousPage}
                disabled={!cursorHistory.length || isFetching}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <span className="px-1 text-[11px] text-slate-400">
                Page {cursorHistory.length + 1}
              </span>
              <button
                type="button"
                onClick={goToNextPage}
                disabled={!pagination.hasMore || isFetching}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </footer>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
          <p className="max-w-3xl text-[11px] leading-5 text-slate-400">
            Reports are generated from stored TrendPilot records. User reports
            contain profile information only and do not expose authentication
            credentials or private sign-in metadata.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
            Refresh data
          </button>
        </div>
      </div>
    </div>
  );
}
