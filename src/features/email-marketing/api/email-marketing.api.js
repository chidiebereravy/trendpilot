import api from "@/lib/api/axios";

export async function getEmailCampaigns(filters = {}) {
  const response = await api.get("/dashboard/email-marketing/campaigns", {
    params: filters,
  });

  return response.data.data;
}

export async function createEmailCampaign(payload) {
  const response = await api.post(
    "/dashboard/email-marketing/campaigns",
    payload,
  );

  return response.data.data;
}

export async function updateEmailCampaign(campaignId, payload) {
  const response = await api.patch(
    `/dashboard/email-marketing/campaigns/${campaignId}`,
    payload,
  );

  return response.data.data;
}

export async function runEmailCampaignAction(campaignId, action) {
  const response = await api.post(
    `/dashboard/email-marketing/campaigns/${campaignId}/send`,
    { action },
  );

  return response.data.data;
}

export async function getEmailSubscribers(filters = {}) {
  const response = await api.get("/dashboard/email-marketing/subscribers", {
    params: filters,
  });

  return response.data.data;
}

export async function getEmailCampaignReport(filters = {}) {
  const response = await api.get("/dashboard/email-marketing/reports", {
    params: filters,
  });

  return response.data.data;
}

export async function getUncertainEmailDeliveries(campaignId) {
  const response = await api.get(
    `/dashboard/email-marketing/campaigns/${campaignId}/deliveries`,
  );

  return response.data.data;
}

export async function resolveUncertainEmailDelivery(campaignId, payload) {
  const response = await api.patch(
    `/dashboard/email-marketing/campaigns/${campaignId}/deliveries`,
    payload,
  );

  return response.data.data;
}
