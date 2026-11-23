import api from "@/lib/api/axios";

export async function getCategories(filters = {}) {
  const response = await api.get("/dashboard/categories", {
    params: filters,
  });

  return response.data.data;
}

export async function createCategory(payload) {
  const response = await api.post("/dashboard/categories", payload);

  return response.data.data;
}

export async function updateCategory(categoryId, payload) {
  const response = await api.patch(
    `/dashboard/categories/${categoryId}`,
    payload,
  );

  return response.data.data;
}

export async function deleteCategory(categoryId) {
  const response = await api.delete(`/dashboard/categories/${categoryId}`);

  return response.data;
}
