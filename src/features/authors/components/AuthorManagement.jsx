"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  Search,
  Users,
} from "lucide-react";

import { useDashboardAuthors } from "@/features/authors/queries/author.queries";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 20;

const roles = [
  { value: "author", label: "Author" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Administrator" },
];

const roleStyles = {
  author: "bg-blue-50 text-blue-700",
  editor: "bg-violet-50 text-violet-700",
  admin: "bg-[#f5f1e9] text-[#876638]",
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function getInitials(name) {
  return (name?.trim() || "A")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function RoleLabel({ role }) {
  const label = roles.find((item) => item.value === role)?.label || role;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${
        roleStyles[role] || "bg-slate-100 text-slate-700"
      }`}
    >
      {label}
    </span>
  );
}

function AuthorSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-[#e8e9ed]">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-5 py-5 sm:px-6">
          <div className="h-11 w-11 rounded-full bg-gray-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-36 rounded bg-gray-200" />
            <div className="h-3 w-24 rounded bg-gray-100" />
          </div>
          <div className="h-6 w-20 rounded-full bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

function AuthorEmptyState({ hasFilters }) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f7f8fa] text-[#98743d]">
        <Users size={23} />
      </div>

      <h3 className="mt-5 text-lg font-semibold text-[#172033]">
        {hasFilters
          ? "No matching editorial profiles"
          : "No editorial profiles yet"}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        {hasFilters
          ? "Try another name or choose a different role."
          : "Accounts assigned an author, editor, or administrator role will appear here."}
      </p>
    </div>
  );
}

export default function AuthorManagement() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const filters = useMemo(
    () => ({
      search: search || undefined,
      role: roleFilter || undefined,
    }),
    [search, roleFilter],
  );

  const authorsQuery = useDashboardAuthors(filters);
  const authors =
    authorsQuery.data?.pages.flatMap((page) => page.items ?? []) ?? [];

  const hasFilters = Boolean(search || roleFilter);

  function applySearch(event) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setRoleFilter("");
  }

  if (authorsQuery.isPending) {
    return (
      <div className="container-main py-10">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 overflow-hidden rounded-xl border border-[#e8e9ed] bg-white">
          <AuthorSkeleton />
        </div>
      </div>
    );
  }

  if (authorsQuery.isError) {
    return (
      <div className="container-main py-10">
        <div className="rounded-xl border border-red-100 bg-red-50 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
            <AlertCircle size={17} />
            We could not load the authors directory.
          </div>

          <p className="mt-2 text-sm text-red-700">
            {getErrorMessage(authorsQuery.error)}
          </p>

          <button
            type="button"
            onClick={() => authorsQuery.refetch()}
            className="mt-4 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-8 pb-16 sm:py-12">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-[#b99658] uppercase">
            Editorial workspace
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#14243d] sm:text-4xl">
            Authors
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
            Browse the people responsible for creating and managing
            TrendPilot&apos;s editorial content.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Users size={17} className="text-[#98743d]" />
          Editorial directory
        </div>
      </div>

      <section className="mt-8 overflow-hidden rounded-xl border border-[#e8e9ed] bg-white shadow-sm">
        <div className="border-b border-[#e8e9ed] p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#172033]">
                Editorial profiles
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Browse authors, editors, and administrators.
              </p>
            </div>

            <form
              onSubmit={applySearch}
              className="flex flex-col gap-3 lg:flex-row"
            >
              <label className="relative block flex-1">
                <span className="sr-only">Search editorial profiles</span>
                <Search
                  size={17}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  maxLength={100}
                  placeholder="Search by display name..."
                  className="h-11 w-full rounded-md border border-[#e3e5e9] bg-white pr-3 pl-10 text-sm transition outline-none placeholder:text-gray-400 focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/10"
                />
              </label>

              <label className="block lg:min-w-[210px]">
                <span className="sr-only">Filter by editorial role</span>
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="h-11 w-full rounded-md border border-[#e3e5e9] bg-white px-3 text-sm text-[#26354a] outline-none focus:border-[#b99658]"
                >
                  <option value="">All editorial roles</option>
                  {roles.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#14243d] px-5 text-sm font-semibold text-white transition hover:bg-[#203653]"
              >
                <Search size={15} />
                Search
              </button>
            </form>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                Showing {authors.length} profile
                {authors.length === 1 ? "" : "s"}
                {hasFilters ? " matching your filters" : " on loaded pages"}.
              </p>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-left text-xs font-semibold text-[#98743d] transition hover:text-[#14243d] sm:text-right"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {authorsQuery.isFetching && !authorsQuery.isFetchingNextPage && (
          <div className="flex items-center gap-2 border-b border-[#e8e9ed] bg-[#fafbfc] px-5 py-2 text-xs text-gray-500">
            <LoaderCircle size={13} className="animate-spin" />
            Updating editorial directory...
          </div>
        )}

        {authors.length === 0 ? (
          <AuthorEmptyState hasFilters={hasFilters} />
        ) : (
          <>
            <div className="divide-y divide-[#eef0f2]">
              {authors.map((author) => (
                <div
                  key={author.id}
                  className="flex flex-col gap-3 px-5 py-5 transition hover:bg-[#fcfcfb] sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0e9dc] text-xs font-bold text-[#876638]">
                      {getInitials(author.displayName)}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#172033]">
                        {author.displayName || "Unnamed profile"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Joined {formatDate(author.joinedAt) || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:justify-end">
                    <RoleLabel role={author.role} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-[#e8e9ed] bg-[#fcfcfb] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-gray-500">
                Profiles are loaded in groups of {PAGE_SIZE}.
              </p>

              {authorsQuery.hasNextPage ? (
                <button
                  type="button"
                  onClick={() => authorsQuery.fetchNextPage()}
                  disabled={authorsQuery.isFetchingNextPage}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[#dfe2e8] bg-white px-4 py-2.5 text-xs font-semibold text-[#26354a] transition hover:border-[#b99658] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {authorsQuery.isFetchingNextPage ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                  Load more profiles
                </button>
              ) : (
                <span className="text-xs font-medium text-gray-400">
                  <CheckCircle2 size={13} className="mr-1 inline" />
                  All matching profiles loaded
                </span>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
