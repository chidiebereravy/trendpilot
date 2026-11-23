import api from "@/lib/api/axios";

export async function getDashboardAuthors(filters = {}) {
  const response = await api.get("/dashboard/authors", {
    params: filters,
  });

  return response.data.data;
}
