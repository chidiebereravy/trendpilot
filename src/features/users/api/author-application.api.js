import api from "@/lib/api/axios";

export async function submitAuthorApplication(payload) {
  const response = await api.post("/dashboard/author-applications", payload);

  return response.data.data;
}

export async function getAdminAuthorApplications(filters = {}) {
  const response = await api.get("/dashboard/admin/author-applications", {
    params: filters,
  });

  return response.data.data;
}

export async function reviewAuthorApplication(applicationId, payload) {
  const response = await api.patch(
    `/dashboard/admin/author-applications/${applicationId}/review`,
    payload,
  );

  return response.data.data;
}

export async function getMyAuthorApplication() {
  const response = await api.get("/dashboard/author-applications");

  return response.data.data;
}
