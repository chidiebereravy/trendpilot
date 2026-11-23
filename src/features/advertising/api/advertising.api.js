import api from "@/lib/api/axios";

export async function getAdvertisementsOverview() {
  const response = await api.get("/dashboard/advertisements/overview");
  return response.data.data;
}

export async function getCampaigns(filters = {}) {
  const response = await api.get("/dashboard/advertisements/campaigns", {
    params: filters,
  });

  return response.data.data;
}

export async function createCampaign(payload) {
  const response = await api.post(
    "/dashboard/advertisements/campaigns",
    payload,
  );

  return response.data.data;
}

export async function updateCampaign(campaignId, payload) {
  const response = await api.patch(
    `/dashboard/advertisements/campaigns/${campaignId}`,
    payload,
  );

  return response.data.data;
}

export async function getAdvertisingNetworks(filters = {}) {
  const response = await api.get("/dashboard/advertisements/networks", {
    params: filters,
  });

  return response.data.data;
}

export async function createAdvertisingNetwork(payload) {
  const response = await api.post(
    "/dashboard/advertisements/networks",
    payload,
  );

  return response.data.data;
}

export async function updateAdvertisingNetwork(networkId, payload) {
  const response = await api.patch(
    `/dashboard/advertisements/networks/${networkId}`,
    payload,
  );

  return response.data.data;
}

export async function getAdvertisers(filters = {}) {
  const response = await api.get("/dashboard/advertisements/advertisers", {
    params: filters,
  });

  return response.data.data;
}

export async function createAdvertiser(payload) {
  const response = await api.post(
    "/dashboard/advertisements/advertisers",
    payload,
  );

  return response.data.data;
}

export async function updateAdvertiser(advertiserId, payload) {
  const response = await api.patch(
    `/dashboard/advertisements/advertisers/${advertiserId}`,
    payload,
  );

  return response.data.data;
}
export async function getAdPlacements(filters = {}) {
  const response = await api.get("/dashboard/advertisements/placements", {
    params: filters,
  });

  return response.data.data;
}

export async function createAdPlacement(payload) {
  const response = await api.post(
    "/dashboard/advertisements/placements",
    payload,
  );

  return response.data.data;
}

export async function updateAdPlacement(placementId, payload) {
  const response = await api.patch(
    `/dashboard/advertisements/placements/${placementId}`,
    payload,
  );

  return response.data.data;
}

export async function getSponsoredContent(filters = {}) {
  const response = await api.get(
    "/dashboard/advertisements/sponsored-content",
    { params: filters },
  );

  return response.data.data;
}

export async function getSponsoredContentOptions(sponsoredContentId) {
  const response = await api.get(
    "/dashboard/advertisements/sponsored-content/options",
    {
      params: sponsoredContentId ? { sponsoredContentId } : {},
    },
  );

  return response.data.data;
}

export async function createSponsoredContent(payload) {
  const response = await api.post(
    "/dashboard/advertisements/sponsored-content",
    payload,
  );

  return response.data.data;
}

export async function updateSponsoredContent(sponsoredContentId, payload) {
  const response = await api.patch(
    `/dashboard/advertisements/sponsored-content/${sponsoredContentId}`,
    payload,
  );

  return response.data.data;
}
