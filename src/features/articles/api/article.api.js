import api from "@/lib/api/axios";

export async function getArticles(filters = {}) {
  const response = await api.get("/dashboard/articles", {
    params: filters,
  });

  return response.data.data;
}

export async function getArticle(articleId) {
  const response = await api.get(`/dashboard/articles/${articleId}`);

  return response.data.data;
}

export async function createArticle(payload) {
  const response = await api.post("/dashboard/articles", payload);

  return response.data.data;
}

export async function updateArticle(articleId, payload) {
  const response = await api.patch(`/dashboard/articles/${articleId}`, payload);

  return response.data.data;
}

export async function deleteArticle(articleId) {
  const response = await api.delete(`/dashboard/articles/${articleId}`);

  return response.data;
}
