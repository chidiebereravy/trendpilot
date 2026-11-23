import api from "@/lib/api/axios";

export async function getArticleOptions() {
  const response = await api.get("/dashboard/articles/options");
  return response.data.data;
}
