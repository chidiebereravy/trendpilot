import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAdvertisingNetwork,
  createAdvertiser,
  createAdPlacement,
  getAdPlacements,
  createCampaign,
  getAdvertisers,
  getAdvertisingNetworks,
  getCampaigns,
  getAdvertisementsOverview,
  updateAdvertiser,
  updateAdPlacement,
  updateAdvertisingNetwork,
  updateCampaign,
  createSponsoredContent,
  getSponsoredContent,
  getSponsoredContentOptions,
  updateSponsoredContent,
} from "@/features/advertising/api/advertising.api";

import { advertisingKeys } from "@/features/advertising/queries/advertising.keys";

export function useAdvertisementsOverview() {
  return useQuery({
    queryKey: advertisingKeys.overview(),
    queryFn: getAdvertisementsOverview,
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useCampaigns(filters = {}) {
  return useQuery({
    queryKey: advertisingKeys.campaignList(filters),
    queryFn: () => getCampaigns(filters),
    staleTime: 15 * 1000,
    retry: false,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.campaigns(),
      });
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.overview(),
      });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, payload }) =>
      updateCampaign(campaignId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.campaigns(),
      });
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.overview(),
      });
    },
  });
}

export function useAdvertisingNetworks(filters = {}, enabled = true) {
  return useQuery({
    queryKey: advertisingKeys.networkList(filters),
    queryFn: () => getAdvertisingNetworks(filters),
    staleTime: 15 * 1000,
    retry: false,
    enabled,
  });
}

export function useCreateAdvertisingNetwork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAdvertisingNetwork,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.networks(),
      });
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.overview(),
      });
    },
  });
}

export function useUpdateAdvertisingNetwork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ networkId, payload }) =>
      updateAdvertisingNetwork(networkId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.networks(),
      });
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.overview(),
      });
    },
  });
}

export function useAdvertisers(filters = {}, enabled = true) {
  return useQuery({
    queryKey: advertisingKeys.advertiserList(filters),
    queryFn: () => getAdvertisers(filters),
    staleTime: 15 * 1000,
    retry: false,
    enabled,
  });
}

export function useCreateAdvertiser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAdvertiser,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.advertisers(),
      });
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.overview(),
      });
    },
  });
}

export function useUpdateAdvertiser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ advertiserId, payload }) =>
      updateAdvertiser(advertiserId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.advertisers(),
      });
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.overview(),
      });
    },
  });
}
export function useAdPlacements(filters = {}, enabled = true) {
  return useQuery({
    queryKey: advertisingKeys.placementList(filters),
    queryFn: () => getAdPlacements(filters),
    staleTime: 15 * 1000,
    retry: false,
    enabled,
  });
}

export function useCreateAdPlacement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAdPlacement,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.placements(),
      });
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.overview(),
      });
    },
  });
}

export function useUpdateAdPlacement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ placementId, payload }) =>
      updateAdPlacement(placementId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.placements(),
      });
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.overview(),
      });
    },
  });
}

export function useSponsoredContent(filters = {}, enabled = true) {
  return useQuery({
    queryKey: advertisingKeys.sponsoredContentList(filters),
    queryFn: () => getSponsoredContent(filters),
    staleTime: 15 * 1000,
    retry: false,
    enabled,
  });
}

export function useSponsoredContentOptions(
  sponsoredContentId = null,
  enabled = true,
) {
  return useQuery({
    queryKey: advertisingKeys.sponsoredContentOptions(sponsoredContentId),
    queryFn: () => getSponsoredContentOptions(sponsoredContentId),
    staleTime: 15 * 1000,
    retry: false,
    enabled,
  });
}

export function useCreateSponsoredContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSponsoredContent,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.sponsoredContent(),
      });
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.overview(),
      });
    },
  });
}

export function useUpdateSponsoredContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sponsoredContentId, payload }) =>
      updateSponsoredContent(sponsoredContentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.sponsoredContent(),
      });
      queryClient.invalidateQueries({
        queryKey: advertisingKeys.overview(),
      });
    },
  });
}
