"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateSeoSettings } from "@/features/seo/api/seo.api";
import { seoKeys } from "@/features/seo/queries/seo.keys";

export function useUpdateSeoSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSeoSettings,

    onSuccess: async (updatedSettings) => {
      queryClient.setQueryData(seoKeys.settings(), updatedSettings);
    },
  });
}
