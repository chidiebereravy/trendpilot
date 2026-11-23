"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { getArticleComments } from "@/features/comments/api/comment.api";
import { commentQueryKeys } from "@/features/comments/queries/comment.keys";

export function useArticleComments(slug) {
  return useInfiniteQuery({
    queryKey: commentQueryKeys.articleList(slug),
    queryFn: ({ pageParam }) =>
      getArticleComments(slug, {
        limit: 20,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasMore ? lastPage.pagination.nextCursor : undefined,
    enabled: Boolean(slug),
    staleTime: 30 * 1000,
    retry: false,
  });
}
