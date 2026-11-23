import api from "@/lib/api/axios";

export async function getDashboardComments(filters = {}) {
  const response = await api.get("/dashboard/comments", {
    params: filters,
  });

  return response.data.data;
}

export async function deleteComment(commentId) {
  const response = await api.delete(`/comments/${commentId}`);

  return response.data.data;
}

export async function getCommentReplies(commentId, filters = {}) {
  const response = await api.get(`/comments/${commentId}/replies`, {
    params: filters,
  });

  return response.data.data;
}

export async function getDashboardCommentOptions() {
  const response = await api.get("/dashboard/comments/options");

  return response.data.data;
}

export async function getArticleComments(slug, filters = {}) {
  const response = await api.get(
    `/articles/${encodeURIComponent(slug)}/comments`,
    { params: filters },
  );

  return response.data.data;
}

export async function createArticleComment(slug, payload) {
  const response = await api.post(
    `/articles/${encodeURIComponent(slug)}/comments`,
    payload,
  );

  return response.data.data;
}
