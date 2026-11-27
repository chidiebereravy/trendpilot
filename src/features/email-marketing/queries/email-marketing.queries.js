import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createEmailCampaign,
  getEmailCampaignReport,
  getEmailCampaigns,
  getEmailSubscribers,
  runEmailCampaignAction,
  updateEmailCampaign,
} from "@/features/email-marketing/api/email-marketing.api";

import { emailMarketingKeys } from "@/features/email-marketing/queries/email-marketing.keys";

export function useEmailCampaigns(filters = {}) {
  return useQuery({
    queryKey: emailMarketingKeys.campaignList(filters),
    queryFn: () => getEmailCampaigns(filters),
    staleTime: 15 * 1000,
    retry: false,
  });
}

export function useCreateEmailCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEmailCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: emailMarketingKeys.campaigns(),
      });
    },
  });
}

export function useUpdateEmailCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, payload }) =>
      updateEmailCampaign(campaignId, payload),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: emailMarketingKeys.campaigns(),
      });

      queryClient.invalidateQueries({
        queryKey: emailMarketingKeys.campaignDetail(variables.campaignId),
      });
    },
  });
}

export function useEmailCampaignAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, action }) =>
      runEmailCampaignAction(campaignId, action),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: emailMarketingKeys.campaigns(),
      });
    },
  });
}

export function useEmailSubscribers(filters = {}) {
  return useQuery({
    queryKey: emailMarketingKeys.subscriberList(filters),
    queryFn: () => getEmailSubscribers(filters),
    staleTime: 15 * 1000,
    retry: false,
  });
}

export function useEmailCampaignReport(filters = {}) {
  return useQuery({
    queryKey: emailMarketingKeys.report(filters),
    queryFn: () => getEmailCampaignReport(filters),
    staleTime: 30_000,
  });
}
