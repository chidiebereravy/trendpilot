import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteNotification,
  markAllNotificationsAsRead,
  updateNotification,
} from "@/features/notifications/api/notification.api";
import { notificationKeys } from "@/features/notifications/queries/notification.keys";

async function invalidateNotificationQueries(queryClient) {
  await queryClient.invalidateQueries({
    queryKey: notificationKeys.all,
  });
}

export function useUpdateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ notificationId, read }) =>
      updateNotification(notificationId, { read }),
    onSuccess: () => invalidateNotificationQueries(queryClient),
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => invalidateNotificationQueries(queryClient),
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => invalidateNotificationQueries(queryClient),
  });
}
