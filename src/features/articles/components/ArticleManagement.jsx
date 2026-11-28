"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FilePlus2,
  Filter,
  LoaderCircle,
  MoreHorizontal,
  Search,
  Trash2,
} from "lucide-react";

import {
  useDeleteArticle,
  useArticles,
} from "@/features/articles/hooks/useArticles";
import { useArticleOptions } from "@/features/articles/queries/article-options.queries";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 10;

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const statusStyles = {
  draft: "bg-slate-100 text-slate-700",
  in_review: "bg-amber-50 text-amber-700",
  scheduled: "bg-blue-50 text-blue-700",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-gray-100 text-gray-500",
};

function StatusBadge({ status }) {
  const label =
    statusOptions.find((item) => item.value === status)?.label ?? status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[status] || statusStyles.draft}`}
    >
      {label}
    </span>
  );
}

function ArticleManagementSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-9 w-56 animate-pulse rounded bg-gray-200" />
      <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
      <div className="h-72 animate-pulse rounded-xl bg-gray-100" />
    </div>
  );
}

function ErrorPanel({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-6">
      <p className="text-sm font-semibold text-red-800">
        We could not load this information.
      </p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyState({ hasFilters }) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f7f8fa] text-[#98743d]">
        <FilePlus2 size={23} />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-[#172033]">
        {hasFilters
          ? "No matching articles"
          : "Your editorial workspace is ready"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        {hasFilters
          ? "Try changing your search or filters to find the articles you need."
          : "Articles you create will appear here. Start with a draft and build it into a useful resource for your readers."}
      </p>
      {!hasFilters && (
        <Link
          href="/dashboard/articles/new"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#14243d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#203653]"
        >
          <FilePlus2 size={16} />
          Create your first article
        </Link>
      )}
    </div>
  );
}

export default function ArticleManagement() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);

  const filters = {
    search: search.trim() || undefined,
    status: status || undefined,
    categoryId: categoryId || undefined,
    page,
    pageSize: PAGE_SIZE,
    sort: "updated_at",
    order: "desc",
  };

  const articlesQuery = useArticles(filters);
  const optionsQuery = useArticleOptions();
  const deleteArticle = useDeleteArticle();

  const articles = articlesQuery.data?.items ?? [];
  const pagination = articlesQuery.data?.pagination;
  const options = optionsQuery.data;
  const categories = options?.categories ?? [];
  const authors = options?.authors ?? [];
  const permissions = options?.permissions ?? {};

  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );

  const authorNames = new Map(
    authors.map((author) => [
      author.id,
      author.display_name || "Unnamed author",
    ]),
  );

  const hasFilters = Boolean(search || status || categoryId);

  const publishedCount = articles.filter(
    (article) => article.status === "published",
  ).length;

  const draftCount = articles.filter(
    (article) => article.status === "draft",
  ).length;

  const reviewCount = articles.filter(
    (article) => article.status === "in_review",
  ).length;

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  function handleDelete(article) {
    const confirmed = window.confirm(
      `Delete "${article.title}"? This action cannot be undone.`,
    );

    if (confirmed) {
      deleteArticle.mutate(article.id);
    }
  }

  if (articlesQuery.isPending || optionsQuery.isPending) {
    return (
      <div className="container-main py-10">
        <ArticleManagementSkeleton />
      </div>
    );
  }

  if (articlesQuery.isError) {
    return (
      <div className="container-main py-10">
        <ErrorPanel
          message={
            articlesQuery.error?.response?.data?.error?.message ||
            articlesQuery.error.message
          }
          onRetry={() => articlesQuery.refetch()}
        />
      </div>
    );
  }

  if (optionsQuery.isError) {
    return (
      <div className="container-main py-10">
        <ErrorPanel
          message={
            optionsQuery.error?.response?.data?.error?.message ||
            optionsQuery.error.message
          }
          onRetry={() => optionsQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="container-main py-8 pb-16 sm:py-12">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] text-[#b99658] uppercase">
            Editorial workspace
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#14243d] sm:text-4xl">
            Articles
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
            Create, organize and manage your editorial content across
            TrendPilot.
          </p>
        </div>

        <Link
          href="/dashboard/articles/new"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#14243d] px-5 py-3 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#203653]"
        >
          <FilePlus2 size={17} />
          New article
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#e8e9ed] bg-white p-5">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Articles on this page
          </p>
          <p className="mt-3 text-3xl font-semibold text-[#14243d]">
            {pagination?.total ?? articles.length}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Matching your current filters
          </p>
        </div>

        <div className="rounded-xl border border-[#e8e9ed] bg-white p-5">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Published on this page
          </p>
          <p className="mt-3 text-3xl font-semibold text-emerald-700">
            {publishedCount}
          </p>
          <p className="mt-1 text-xs text-gray-400">Currently published</p>
        </div>

        <div className="rounded-xl border border-[#e8e9ed] bg-white p-5">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Drafts on this page
          </p>
          <p className="mt-3 text-3xl font-semibold text-[#14243d]">
            {draftCount}
          </p>
          <p className="mt-1 text-xs text-gray-400">Work in progress</p>
        </div>

        <div className="rounded-xl border border-[#e8e9ed] bg-white p-5">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Awaiting review on this page
          </p>
          <p className="mt-3 text-3xl font-semibold text-amber-700">
            {reviewCount}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Submitted for editorial review
          </p>
        </div>
      </div>

      <section className="mt-8 overflow-hidden rounded-xl border border-[#e8e9ed] bg-white shadow-sm">
        <div className="border-b border-[#e8e9ed] p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#172033]">
                Content library
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Search and manage your articles.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative block sm:min-w-[250px]">
                <span className="sr-only">Search articles</span>
                <Search
                  size={17}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    updateFilter(setSearch, event.target.value)
                  }
                  placeholder="Search article titles..."
                  className="h-11 w-full rounded-md border border-[#e3e5e9] bg-white pr-3 pl-10 text-sm transition outline-none placeholder:text-gray-400 focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/10"
                />
              </label>

              <label className="relative block sm:min-w-[160px]">
                <span className="sr-only">Filter by status</span>
                <Filter
                  size={15}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                />
                <select
                  value={status}
                  onChange={(event) =>
                    updateFilter(setStatus, event.target.value)
                  }
                  className="h-11 w-full appearance-none rounded-md border border-[#e3e5e9] bg-white pr-8 pl-9 text-sm text-[#26354a] outline-none focus:border-[#b99658]"
                >
                  {statusOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block sm:min-w-[190px]">
                <span className="sr-only">Filter by Micro Niche</span>
                <select
                  value={categoryId}
                  onChange={(event) =>
                    updateFilter(setCategoryId, event.target.value)
                  }
                  className="h-11 w-full rounded-md border border-[#e3e5e9] bg-white px-3 text-sm text-[#26354a] outline-none focus:border-[#b99658]"
                >
                  <option value="">All Micro Niches</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        {articlesQuery.isFetching && (
          <div className="flex items-center gap-2 border-b border-[#e8e9ed] bg-[#fafbfc] px-5 py-2 text-xs text-gray-500">
            <LoaderCircle size={13} className="animate-spin" />
            Updating articles...
          </div>
        )}

        {articles.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#e8e9ed] bg-[#fafbfc]">
                    <th className="px-5 py-4 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                      Article
                    </th>

                    <th className="px-4 py-4 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                      Author
                    </th>
                    <th className="px-4 py-4 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-4 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                      Last updated
                    </th>
                    <th className="px-4 py-4 text-right text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eef0f2]">
                  {articles.map((article) => (
                    <tr
                      key={article.id}
                      className="transition-colors hover:bg-[#fafbfc]"
                    >
                      <td className="max-w-[360px] px-5 py-4">
                        <Link
                          href={`/dashboard/articles/${article.id}/edit`}
                          className="line-clamp-2 text-sm font-semibold text-[#172033] transition hover:text-[#98743d]"
                        >
                          {article.title}
                        </Link>
                        <p className="mt-1 truncate text-xs text-gray-400">
                          /{article.slug}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-600">
                        {authorNames.get(article.author_id) || "Unknown author"}
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={article.status} />
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(article.updated_at)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/articles/${article.id}/edit`}
                            className="rounded-md border border-[#e3e5e9] px-3 py-2 text-xs font-semibold text-[#26354a] transition hover:border-[#b99658] hover:text-[#98743d]"
                          >
                            Edit
                          </Link>

                          {permissions.canDeleteArticles && (
                            <button
                              type="button"
                              onClick={() => handleDelete(article)}
                              disabled={deleteArticle.isPending}
                              aria-label={`Delete ${article.title}`}
                              title="Delete article"
                              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-[#e3e5e9] text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#e8e9ed] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(
                  page * PAGE_SIZE,
                  pagination?.total ?? articles.length,
                )}{" "}
                of {pagination?.total ?? articles.length} articles
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-md border border-[#e3e5e9] px-3 py-2 text-xs font-semibold text-[#26354a] transition hover:border-[#b99658] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="min-w-20 text-center text-xs font-medium text-gray-500">
                  Page {page} of {Math.max(1, pagination?.totalPages ?? 1)}
                </span>

                <button
                  type="button"
                  disabled={page >= (pagination?.totalPages ?? 1)}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-md border border-[#e3e5e9] px-3 py-2 text-xs font-semibold text-[#26354a] transition hover:border-[#b99658] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {deleteArticle.isError && (
        <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {deleteArticle.error?.response?.data?.error?.message ||
            "The article could not be deleted. Please try again."}
        </div>
      )}
    </div>
  );
}
