import api from "@/lib/api/axios";

export async function getDashboardUsers(filters = {}) {
  const response = await api.get("/dashboard/users", {
    params: filters,
  });

  return response.data.data;
}

export async function updateDashboardUserRole(userId, payload) {
  const response = await api.patch(`/dashboard/users/${userId}/role`, payload);

  return response.data.data;
}
