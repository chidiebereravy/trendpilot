import api from "@/lib/api/axios";

export async function getDashboardAnalytics(range = "30d") {
  const response = await api.get("/dashboard/analytics", {
    params: { range },
  });

  return response.data.data;
}
