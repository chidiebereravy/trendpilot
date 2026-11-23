"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { getDashboardComments } from "@/features/comments/api/comment.api";
import { commentQueryKeys } from "@/features/comments/queries/comment.keys";

export function useDashboardComments(filters = {}) {
  return useInfiniteQuery({
    queryKey: commentQueryKeys.dashboardList(filters),
    queryFn: ({ pageParam }) =>
      getDashboardComments({
        ...filters,
        cursor: pageParam ?? undefined,
      }),
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasMore ? lastPage.pagination.nextCursor : undefined,
    staleTime: 30 * 1000,
    retry: false,
  });
}
