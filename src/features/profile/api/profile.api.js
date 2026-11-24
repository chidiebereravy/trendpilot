import api from "@/lib/api/axios";

export async function getProfile() {
  const response = await api.get("/dashboard/profile");
  return response.data.data;
}

export async function updateProfile(payload) {
  const response = await api.patch("/dashboard/profile", payload);
  return response.data.data;
}

export async function changeProfilePassword(payload) {
  const response = await api.post("/dashboard/profile/password", payload);

  return response.data;
}
