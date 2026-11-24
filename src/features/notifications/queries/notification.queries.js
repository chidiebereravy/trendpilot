import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getDashboardNotifications } from "@/features/notifications/api/notification.api";
import { notificationKeys } from "@/features/notifications/queries/notification.keys";

export function useDashboardNotifications(filters = {}) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: ({ pageParam }) =>
      getDashboardNotifications({
        ...filters,
        cursor: pageParam ?? undefined,
      }),
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.nextCursor : undefined,
    staleTime: 30_000,
    retry: false,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const result = await getDashboardNotifications({
        status: "all",
        limit: 1,
      });

      return result.unreadCount;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
}
