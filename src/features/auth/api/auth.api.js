import api from "@/lib/api/axios";

export async function registerAccount(payload, next = null) {
  const params = new URLSearchParams();

  if (next) {
    params.set("next", next);
  }

  const query = params.toString();
  const response = await api.post(
    `/auth/register${query ? `?${query}` : ""}`,
    payload,
  );

  return response.data;
}

export async function loginAccount(payload) {
  const response = await api.post("/auth/login", payload);
  return response.data;
}

export async function logoutAccount() {
  const response = await api.post("/auth/logout");
  return response.data;
}

export async function getAuthSession() {
  try {
    const response = await api.get("/auth/me");
    return response.data.data;
  } catch (error) {
    if (error.response?.status === 401) {
      return null;
    }

    throw error;
  }
}

export async function requestPasswordReset(payload) {
  const response = await api.post("/auth/forgot-password", payload);
  return response.data;
}

export async function updatePassword(payload) {
  const response = await api.post("/auth/reset-password", payload);
  return response.data;
}
