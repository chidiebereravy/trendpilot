import api from "@/lib/api/axios";

export async function getUserRoleHistory(filters = {}) {
  const response = await api.get("/dashboard/admin/user-role-history", {
    params: filters,
  });

  return response.data.data;
}
