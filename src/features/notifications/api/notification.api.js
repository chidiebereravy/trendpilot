import api from "@/lib/api/axios";

export async function getDashboardNotifications(filters = {}) {
  const response = await api.get("/dashboard/notifications", {
    params: filters,
  });

  return response.data.data;
}

export async function updateNotification(notificationId, payload) {
  const response = await api.patch(
    `/dashboard/notifications/${notificationId}`,
    payload,
  );

  return response.data.data;
}

export async function markAllNotificationsAsRead() {
  const response = await api.post("/dashboard/notifications/read-all");

  return response.data.data;
}

export async function deleteNotification(notificationId) {
  const response = await api.delete(
    `/dashboard/notifications/${notificationId}`,
  );

  return response.data.data;
}
