"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { useDashboardComments } from "@/features/comments/queries/comment.queries";
import { useDashboardCommentOptions } from "@/features/comments/queries/comment-options.queries";
import { useCommentReplies } from "@/features/comments/queries/comment-replies.queries";
import { useDeleteComment } from "@/features/comments/mutations/comment.mutations";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 20;

function ErrorPanel({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-6">
      <p className="text-sm font-semibold text-red-800">
        We could not load this discussion.
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

function CommentSkeleton() {
  return (
    <div className="space-y-4 p-5">
      {[1, 2, 3].map((item) => (
        <div key={item} className="animate-pulse border-b border-gray-100 pb-5">
          <div className="h-4 w-40 rounded bg-gray-200" />
          <div className="mt-3 h-3 w-full rounded bg-gray-100" />
          <div className="mt-2 h-3 w-3/4 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

function CommentNode({
  comment,
  articleAuthorId,
  currentUserId,
  role,
  deleteComment,
  depth = 0,
}) {
  const [expanded, setExpanded] = useState(false);

  const repliesQuery = useCommentReplies(comment.id, expanded);
  const replies =
    repliesQuery.data?.pages.flatMap((page) => page.replies ?? []) ?? [];

  const canDelete =
    ["editor", "admin"].includes(role) ||
    currentUserId === articleAuthorId ||
    currentUserId === comment.authorId;

  function handleDelete() {
    if (comment.isDeleted || !canDelete) return;

    const confirmed = window.confirm(
      "Delete this comment? Its replies will remain visible in the discussion.",
    );

    if (confirmed) {
      deleteComment.mutate(comment.id);
    }
  }

  return (
    <div
      className={`relative ${depth > 0 ? "ml-4 border-l-2 border-[#ece8df] pl-4 sm:ml-7 sm:pl-5" : ""}`}
    >
      <article className="py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[#172033]">
                {comment.authorDisplayName || "Former member"}
              </span>

              {comment.isDeleted && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                  Deleted
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-gray-400">
              {formatDate(comment.createdAt)}
              {comment.updatedAt !== comment.createdAt && !comment.isDeleted
                ? " · Edited"
                : ""}
            </p>
          </div>

          {canDelete && !comment.isDeleted && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteComment.isPending}
              aria-label="Delete comment"
              title="Delete comment"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#e3e5e9] text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        <p
          className={`mt-3 text-sm leading-7 ${
            comment.isDeleted
              ? "text-gray-400 italic"
              : "break-words whitespace-pre-wrap text-[#465267]"
          }`}
        >
          {comment.isDeleted
            ? "This comment has been deleted."
            : comment.content}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#98743d] transition hover:text-[#14243d]"
          >
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            {expanded ? "Hide replies" : "View replies"}
          </button>
        </div>

        {expanded && (
          <div className="mt-3">
            {repliesQuery.isPending ? (
              <div className="flex items-center gap-2 py-3 text-xs text-gray-400">
                <LoaderCircle size={14} className="animate-spin" />
                Loading replies...
              </div>
            ) : repliesQuery.isError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                <p className="text-xs text-red-700">
                  {repliesQuery.error?.response?.data?.error?.message ||
                    "Replies could not be loaded."}
                </p>
                <button
                  type="button"
                  onClick={() => repliesQuery.refetch()}
                  className="mt-2 text-xs font-semibold text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                {replies.length === 0 ? (
                  <p className="py-3 text-xs text-gray-400">
                    No replies in this discussion yet.
                  </p>
                ) : (
                  <div className="divide-y divide-[#f0f0ed]">
                    {replies.map((reply) => (
                      <CommentNode
                        key={reply.id}
                        comment={reply}
                        articleAuthorId={articleAuthorId}
                        currentUserId={currentUserId}
                        role={role}
                        deleteComment={deleteComment}
                        depth={depth + 1}
                      />
                    ))}
                  </div>
                )}

                {repliesQuery.hasNextPage && (
                  <button
                    type="button"
                    onClick={() => repliesQuery.fetchNextPage()}
                    disabled={repliesQuery.isFetchingNextPage}
                    className="mt-3 inline-flex items-center gap-2 rounded-md border border-[#e3e5e9] px-3 py-2 text-xs font-semibold text-[#26354a] transition hover:border-[#b99658] disabled:opacity-50"
                  >
                    {repliesQuery.isFetchingNextPage && (
                      <LoaderCircle size={13} className="animate-spin" />
                    )}
                    Load more replies
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </article>
    </div>
  );
}

function EmptyState({ hasFilters }) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f7f8fa] text-[#98743d]">
        <MessageSquare size={23} />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-[#172033]">
        {hasFilters ? "No matching discussions" : "No discussions yet"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        {hasFilters
          ? "Try changing your search or article filter."
          : "Comments on your published articles will appear here as readers join the conversation."}
      </p>
    </div>
  );
}

export default function CommentManagement({ currentUserId, role }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [articleId, setArticleId] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const filters = {
    limit: PAGE_SIZE,
    search: search || undefined,
    articleId: articleId || undefined,
    includeDeleted: String(includeDeleted),
  };

  const commentsQuery = useDashboardComments(filters);
  const optionsQuery = useDashboardCommentOptions();
  const deleteComment = useDeleteComment();

  const comments =
    commentsQuery.data?.pages.flatMap((page) => page.items ?? []) ?? [];

  const articles = optionsQuery.data?.articles ?? [];

  const hasFilters = Boolean(search || articleId || includeDeleted);

  function applySearch(event) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setArticleId("");
    setIncludeDeleted(false);
  }

  if (commentsQuery.isPending || optionsQuery.isPending) {
    return (
      <div className="container-main py-10">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 rounded-xl border border-[#e8e9ed] bg-white">
          <CommentSkeleton />
        </div>
      </div>
    );
  }

  if (commentsQuery.isError || optionsQuery.isError) {
    const failedQuery = commentsQuery.isError ? commentsQuery : optionsQuery;

    return (
      <div className="container-main py-10">
        <ErrorPanel
          message={
            failedQuery.error?.response?.data?.error?.message ||
            failedQuery.error?.message ||
            "Please try again."
          }
          onRetry={() => {
            commentsQuery.refetch();
            optionsQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="container-main py-8 pb-16 sm:py-12">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] text-[#b99658] uppercase">
            Community workspace
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#14243d] sm:text-4xl">
            Comments
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
            Follow reader conversations, explore nested replies and manage
            discussions across your published articles.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <MessageSquare size={17} className="text-[#98743d]" />
          Published discussions
        </div>
      </div>

      <section className="mt-8 overflow-hidden rounded-xl border border-[#e8e9ed] bg-white shadow-sm">
        <div className="border-b border-[#e8e9ed] p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#172033]">
                Discussion library
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Search comments or narrow discussions to a particular article.
              </p>
            </div>

            <form
              onSubmit={applySearch}
              className="flex flex-col gap-3 lg:flex-row"
            >
              <label className="relative block flex-1">
                <span className="sr-only">Search comment content</span>
                <Search
                  size={17}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search comment content..."
                  className="h-11 w-full rounded-md border border-[#e3e5e9] bg-white pr-3 pl-10 text-sm transition outline-none placeholder:text-gray-400 focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/10"
                />
              </label>

              <label className="block lg:min-w-[250px]">
                <span className="sr-only">Filter by article</span>
                <select
                  value={articleId}
                  onChange={(event) => setArticleId(event.target.value)}
                  className="h-11 w-full rounded-md border border-[#e3e5e9] bg-white px-3 text-sm text-[#26354a] outline-none focus:border-[#b99658]"
                >
                  <option value="">All published articles</option>
                  {articles.map((article) => (
                    <option key={article.id} value={article.id}>
                      {article.title}
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={includeDeleted}
                  onChange={(event) => setIncludeDeleted(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-[#14243d]"
                />
                Include deleted discussions
              </label>

              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-left text-xs font-semibold text-[#98743d] transition hover:text-[#14243d] sm:text-right"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {commentsQuery.isFetching && !commentsQuery.isFetchingNextPage && (
          <div className="flex items-center gap-2 border-b border-[#e8e9ed] bg-[#fafbfc] px-5 py-2 text-xs text-gray-500">
            <LoaderCircle size={13} className="animate-spin" />
            Updating discussions...
          </div>
        )}

        {comments.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <>
            <div className="divide-y divide-[#e8e9ed]">
              {comments.map((comment) => (
                <div key={comment.id} className="p-5 sm:p-6">
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold tracking-[0.14em] text-[#b99658] uppercase">
                        Article discussion
                      </p>
                      <Link
                        href={`/articles/${comment.article?.slug ?? ""}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block max-w-full truncate text-sm font-semibold text-[#172033] transition hover:text-[#98743d]"
                      >
                        {comment.article?.title || "Unavailable article"}
                      </Link>
                    </div>

                    <span className="shrink-0 text-xs text-gray-400">
                      {comment.depth === 0 ? "Main discussion" : "Reply"}
                    </span>
                  </div>

                  <CommentNode
                    comment={comment}
                    articleAuthorId={comment.article?.author_id}
                    currentUserId={currentUserId}
                    role={role}
                    deleteComment={deleteComment}
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-[#e8e9ed] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                Showing {comments.length} loaded discussions
              </p>

              {commentsQuery.hasNextPage && (
                <button
                  type="button"
                  onClick={() => commentsQuery.fetchNextPage()}
                  disabled={commentsQuery.isFetchingNextPage}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[#e3e5e9] px-4 py-2.5 text-xs font-semibold text-[#26354a] transition hover:border-[#b99658] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {commentsQuery.isFetchingNextPage ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={13} />
                  )}
                  Load more discussions
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {deleteComment.isError && (
        <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {deleteComment.error?.response?.data?.error?.message ||
            "The comment could not be deleted. Your permissions may not allow this action."}
        </div>
      )}
    </div>
  );
}
