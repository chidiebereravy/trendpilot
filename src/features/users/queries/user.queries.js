"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { getDashboardUsers } from "@/features/users/api/user.api";
import { userQueryKeys } from "@/features/users/queries/user.keys";

export function useDashboardUsers(filters = {}) {
  return useInfiniteQuery({
    queryKey: userQueryKeys.dashboardList(filters),

    queryFn: ({ pageParam }) =>
      getDashboardUsers({
        ...filters,
        limit: 20,
        cursor: pageParam ?? undefined,
      }),

    initialPageParam: null,

    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasMore
        ? lastPage.pagination.nextCursor
        : undefined,

    staleTime: 30 * 1000,
    retry: false,
  });
}
