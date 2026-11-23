"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { getCommentReplies } from "@/features/comments/api/comment.api";
import { commentQueryKeys } from "@/features/comments/queries/comment.keys";

export function useCommentReplies(commentId, enabled = true) {
  return useInfiniteQuery({
    queryKey: commentQueryKeys.replies(commentId),
    queryFn: ({ pageParam }) =>
      getCommentReplies(commentId, {
        limit: 10,
        cursor: pageParam ?? undefined,
      }),
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasMore ? lastPage.pagination.nextCursor : undefined,
    enabled: Boolean(commentId) && enabled,
    staleTime: 30 * 1000,
    retry: false,
  });
}
