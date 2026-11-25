import api from "@/lib/api/axios";

export async function getMedia(filters = {}) {
  const response = await api.get("/dashboard/media", {
    params: filters,
  });

  return response.data.data;
}

export async function updateMediaMetadata({ mediaId, ...payload }) {
  const response = await api.patch(`/dashboard/media/${mediaId}`, payload);

  return response.data.data;
}

export async function publishMedia(mediaId) {
  const response = await api.post(`/dashboard/media/${mediaId}/publish`);

  return response.data.data;
}

export async function archiveMedia(mediaId) {
  const response = await api.post(`/dashboard/media/${mediaId}/archive`);

  return response.data.data;
}

export async function uploadMedia({
  file,
  purpose,
  altText = "",
  caption = "",
}) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("purpose", purpose);
  formData.append("altText", altText);
  formData.append("caption", caption);

  const response = await api.post("/dashboard/media", formData);

  return response.data.data;
}
