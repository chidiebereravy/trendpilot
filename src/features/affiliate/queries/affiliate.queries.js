import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAffiliateLink,
  createAffiliateProgram,
  getAffiliateLink,
  getAffiliateLinks,
  getAffiliateLinkStats,
  getAffiliatePrograms,
  updateAffiliateLink,
  updateAffiliateProgram,
  getArticleAffiliatePlacements,
  saveArticleAffiliatePlacements,
} from "@/features/affiliate/api/affiliate.api";

import { affiliateKeys } from "@/features/affiliate/queries/affiliate.keys";

export function useAffiliateLinks(filters = {}) {
  return useQuery({
    queryKey: affiliateKeys.linkList(filters),
    queryFn: () => getAffiliateLinks(filters),
    staleTime: 15 * 1000,
    retry: false,
  });
}

export function useAffiliateLink(linkId, options = {}) {
  return useQuery({
    queryKey: affiliateKeys.linkDetail(linkId),
    queryFn: () => getAffiliateLink(linkId),
    enabled: Boolean(linkId) && (options.enabled ?? true),
    staleTime: 15 * 1000,
    retry: false,
  });
}

export function useAffiliatePrograms(filters = {}) {
  return useQuery({
    queryKey: affiliateKeys.programList(filters),
    queryFn: () => getAffiliatePrograms(filters),
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useCreateAffiliateLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAffiliateLink,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: affiliateKeys.links(),
      });
    },
  });
}

export function useUpdateAffiliateLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ linkId, payload }) => updateAffiliateLink(linkId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: affiliateKeys.links(),
      });

      queryClient.invalidateQueries({
        queryKey: affiliateKeys.linkDetail(variables.linkId),
      });
    },
  });
}

export function useCreateAffiliateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAffiliateProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: affiliateKeys.programs(),
      });
    },
  });
}

export function useUpdateAffiliateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ programId, payload }) =>
      updateAffiliateProgram(programId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: affiliateKeys.programs(),
      });

      queryClient.invalidateQueries({
        queryKey: affiliateKeys.links(),
      });
    },
  });
}

export function useAffiliateLinkStats() {
  return useQuery({
    queryKey: affiliateKeys.linkStats(),
    queryFn: getAffiliateLinkStats,
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useArticleAffiliatePlacements(articleId, options = {}) {
  return useQuery({
    queryKey: affiliateKeys.articlePlacements(articleId),
    queryFn: () => getArticleAffiliatePlacements(articleId),
    enabled: Boolean(articleId) && (options.enabled ?? true),
    staleTime: 15 * 1000,
    retry: false,
  });
}

export function useSaveArticleAffiliatePlacements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ articleId, placements }) =>
      saveArticleAffiliatePlacements(articleId, placements),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: affiliateKeys.articlePlacements(variables.articleId),
      });
    },
  });
}
