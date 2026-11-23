"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { getDashboardAuthors } from "@/features/authors/api/author.api";
import { authorQueryKeys } from "@/features/authors/queries/author.keys";

export function useDashboardAuthors(filters = {}) {
  return useInfiniteQuery({
    queryKey: authorQueryKeys.dashboardList(filters),

    queryFn: ({ pageParam }) =>
      getDashboardAuthors({
        ...filters,
        limit: 20,
        cursor: pageParam ?? undefined,
      }),

    initialPageParam: null,

    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasMore ? lastPage.pagination.nextCursor : undefined,

    staleTime: 30 * 1000,
    retry: false,
  });
}
