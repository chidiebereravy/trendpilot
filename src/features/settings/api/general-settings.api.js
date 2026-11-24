import api from "@/lib/api/axios";

export async function getGeneralSettings() {
  const response = await api.get("/dashboard/settings");

  return response.data.data;
}

export async function updateGeneralSettings(payload) {
  const response = await api.patch("/dashboard/settings", payload);

  return response.data.data;
}
