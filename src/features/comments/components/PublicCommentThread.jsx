"use client";

import { useState, useSyncExternalStore } from "react";

import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  MessageCircle,
  MessageSquare,
  Send,
} from "lucide-react";

import { useAuthSession } from "@/features/auth/hooks/useAuth";
import { useCreateArticleComment } from "@/features/comments/mutations/public-comment.mutations";
import { useArticleComments } from "@/features/comments/queries/public-comment.queries";
import { useCommentReplies } from "@/features/comments/queries/comment-replies.queries";
import { formatDate } from "@/lib/utils";

function subscribeToHydration() {
  return () => {};
}

function getClientHydrationSnapshot() {
  return true;
}

function getServerHydrationSnapshot() {
  return false;
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function CommentComposer({
  mutation,
  parentId = null,
  session,
  sessionLoading,
  sessionError,
  compact = false,
}) {
  const [content, setContent] = useState("");

  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  function handleSubmit(event) {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent || mutation.isPending) return;

    mutation.mutate(
      {
        content: trimmedContent,
        ...(parentId ? { parentId } : {}),
      },
      {
        onSuccess: () => setContent(""),
      },
    );
  }

  if (!isHydrated || sessionLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
        <LoaderCircle size={15} className="animate-spin" />
        Checking your account...
      </div>
    );
  }

  if (sessionError) {
    return (
      <p className="py-3 text-sm text-gray-500">
        We could not verify your account. Please refresh the page to continue.
      </p>
    );
  }

  if (!session?.user) {
    return (
      <div
        className={`rounded-lg border border-[#e9e7e2] bg-[#faf9f6] ${
          compact ? "p-4" : "p-5 sm:p-6"
        }`}
      >
        <p className="text-sm leading-6 text-[#465267]">
          Join the conversation. Sign in to share your thoughts or reply to a
          reader.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href="/auth/login"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#14243d] px-4 text-xs font-semibold text-white transition hover:bg-[#203653]"
          >
            Sign in to comment
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#e3e5e9] px-4 text-xs font-semibold text-[#26354a] transition hover:border-[#b99658]"
          >
            Create an account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-lg border border-[#e9e7e2] bg-[#faf9f6] ${
        compact ? "p-4" : "p-5 sm:p-6"
      }`}
    >
      <label
        htmlFor={parentId ? `reply-${parentId}` : "new-comment"}
        className="mb-2 block text-sm font-semibold text-[#172033]"
      >
        {parentId ? "Write a reply" : "Share your thoughts"}
      </label>

      <textarea
        id={parentId ? `reply-${parentId}` : "new-comment"}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        maxLength={5000}
        rows={compact ? 3 : 4}
        placeholder={
          parentId
            ? "Add something constructive to the conversation..."
            : "What did you think about this article?"
        }
        required
        className="max-h-24 min-h-24 w-full resize-y rounded-md border border-[#e3e5e9] bg-white px-4 py-3 text-sm leading-6 text-[#26354a] transition outline-none placeholder:text-gray-400 focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/10"
      />

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-gray-400">
          {content.length}/5000 characters
        </span>

        <button
          type="submit"
          disabled={!content.trim() || mutation.isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#14243d] px-5 text-xs font-semibold text-white transition hover:bg-[#203653] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? (
            <LoaderCircle size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          {parentId ? "Publish reply" : "Publish comment"}
        </button>
      </div>

      {mutation.isError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {getErrorMessage(mutation.error)}
        </p>
      )}
    </form>
  );
}

function CommentNode({
  comment,
  mutation,
  session,
  sessionLoading,
  sessionError,
  depth = 0,
}) {
  const [expanded, setExpanded] = useState(false);
  const [replying, setReplying] = useState(false);

  const repliesQuery = useCommentReplies(comment.id, expanded);
  const replies =
    repliesQuery.data?.pages.flatMap((page) => page.replies ?? []) ?? [];

  return (
    <article className="py-5">
      <div
        className={depth > 0 ? "border-l-2 border-[#ece8df] pl-4 sm:pl-5" : ""}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-[#172033]">
            {comment.authorDisplayName || "Former member"}
          </span>

          {comment.isDeleted && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
              Deleted
            </span>
          )}

          <span className="text-xs text-gray-400">
            {formatDate(comment.createdAt)}
            {comment.updatedAt !== comment.createdAt && !comment.isDeleted
              ? " · Edited"
              : ""}
          </span>
        </div>

        <p
          className={`mt-3 text-sm leading-7 break-words whitespace-pre-wrap ${
            comment.isDeleted ? "text-gray-400 italic" : "text-[#465267]"
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

          <button
            type="button"
            onClick={() => setReplying((value) => !value)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#657184] transition hover:text-[#14243d]"
          >
            <MessageCircle size={14} />
            {replying ? "Cancel reply" : "Reply"}
          </button>
        </div>

        {replying && (
          <div className="mt-4">
            <CommentComposer
              mutation={mutation}
              parentId={comment.id}
              session={session}
              sessionLoading={sessionLoading}
              sessionError={sessionError}
              compact
            />
          </div>
        )}

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
                  {getErrorMessage(repliesQuery.error)}
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
                    No replies yet. Start the conversation.
                  </p>
                ) : (
                  <div className="divide-y divide-[#f0f0ed]">
                    {replies.map((reply) => (
                      <CommentNode
                        key={reply.id}
                        comment={reply}
                        mutation={mutation}
                        session={session}
                        sessionLoading={sessionLoading}
                        sessionError={sessionError}
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
      </div>
    </article>
  );
}

function CommentSkeleton() {
  return (
    <div className="animate-pulse space-y-5 py-6">
      {[1, 2, 3].map((item) => (
        <div key={item} className="border-b border-[#efeee9] pb-5">
          <div className="h-3 w-36 rounded bg-gray-200" />
          <div className="mt-4 h-3 w-full rounded bg-gray-100" />
          <div className="mt-2 h-3 w-3/4 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

export default function PublicCommentThread({ articleSlug }) {
  const sessionQuery = useAuthSession();
  const commentsQuery = useArticleComments(articleSlug);
  const mutation = useCreateArticleComment(articleSlug);

  const session = sessionQuery.data ?? null;
  const comments =
    commentsQuery.data?.pages.flatMap((page) => page.comments ?? []) ?? [];

  return (
    <section
      aria-labelledby="article-discussion-heading"
      className="border-t border-[#e9e7e2] bg-white"
    >
      <div className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#b99658] uppercase">
              Reader conversation
            </p>
            <h2
              id="article-discussion-heading"
              className="mt-2 text-2xl font-semibold tracking-tight text-[#14243d] sm:text-3xl"
            >
              Join the discussion.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
              Share a perspective, ask a question or respond to another reader.
              Comments are published immediately.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <MessageSquare size={15} className="text-[#98743d]" />
            Open discussion
          </div>
        </div>

        <div className="mt-8">
          <CommentComposer
            mutation={mutation}
            session={session}
            sessionLoading={sessionQuery.isPending}
            sessionError={sessionQuery.isError}
          />
        </div>

        <div className="mt-10">
          <h3 className="text-base font-semibold text-[#172033]">
            Reader comments
          </h3>

          {commentsQuery.isPending ? (
            <CommentSkeleton />
          ) : commentsQuery.isError ? (
            <div className="mt-5 rounded-lg border border-red-100 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-800">
                We could not load the discussion.
              </p>
              <p className="mt-1 text-sm text-red-700">
                {getErrorMessage(commentsQuery.error)}
              </p>
              <button
                type="button"
                onClick={() => commentsQuery.refetch()}
                className="mt-3 text-xs font-semibold text-red-800 underline"
              >
                Try again
              </button>
            </div>
          ) : comments.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-[#e3e5e9] px-5 py-10 text-center">
              <MessageSquare size={25} className="mx-auto text-[#b99658]" />
              <p className="mt-3 text-sm font-semibold text-[#172033]">
                Be the first to comment
              </p>
              <p className="mt-1 text-sm text-gray-500">
                There are no comments on this article yet.
              </p>
            </div>
          ) : (
            <div className="mt-3 divide-y divide-[#e9e7e2]">
              {comments.map((comment) => (
                <CommentNode
                  key={comment.id}
                  comment={comment}
                  mutation={mutation}
                  session={session}
                  sessionLoading={sessionQuery.isPending}
                  sessionError={sessionQuery.isError}
                />
              ))}
            </div>
          )}

          {commentsQuery.hasNextPage && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => commentsQuery.fetchNextPage()}
                disabled={commentsQuery.isFetchingNextPage}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#e3e5e9] px-5 text-xs font-semibold text-[#26354a] transition hover:border-[#b99658] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {commentsQuery.isFetchingNextPage && (
                  <LoaderCircle size={14} className="animate-spin" />
                )}
                Load more comments
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
