import api from "@/lib/api/axios";

export async function getSeoSettings() {
  const response = await api.get("/dashboard/seo");

  return response.data.data;
}

export async function updateSeoSettings(payload) {
  const response = await api.patch("/dashboard/seo", payload);

  return response.data.data;
}
