import api from "@/lib/api/axios";

export async function getAffiliateLinks(filters = {}) {
  const response = await api.get("/dashboard/affiliate/links", {
    params: filters,
  });

  return response.data.data;
}

export async function getAffiliateLink(linkId) {
  const response = await api.get(`/dashboard/affiliate/links/${linkId}`);
  return response.data.data;
}

export async function createAffiliateLink(payload) {
  const response = await api.post("/dashboard/affiliate/links", payload);
  return response.data.data;
}

export async function updateAffiliateLink(linkId, payload) {
  const response = await api.patch(
    `/dashboard/affiliate/links/${linkId}`,
    payload,
  );

  return response.data.data;
}

export async function getAffiliatePrograms(filters = {}) {
  const response = await api.get("/dashboard/affiliate/programs", {
    params: filters,
  });

  return response.data.data;
}

export async function createAffiliateProgram(payload) {
  const response = await api.post("/dashboard/affiliate/programs", payload);
  return response.data.data;
}

export async function updateAffiliateProgram(programId, payload) {
  const response = await api.patch(
    `/dashboard/affiliate/programs/${programId}`,
    payload,
  );

  return response.data.data;
}

export async function getAffiliateLinkStats() {
  const response = await api.get("/dashboard/affiliate/links/stats");
  return response.data.data;
}

export async function getArticleAffiliatePlacements(articleId) {
  const response = await api.get(
    `/dashboard/articles/${articleId}/affiliate-links`,
  );

  return response.data.data;
}

export async function saveArticleAffiliatePlacements(articleId, placements) {
  const response = await api.put(
    `/dashboard/articles/${articleId}/affiliate-links`,
    { placements },
  );

  return response.data.data;
}
