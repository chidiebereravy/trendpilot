"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateGeneralSettings } from "@/features/settings/api/general-settings.api";
import { generalSettingsKeys } from "@/features/settings/queries/general-settings.keys";

export function useUpdateGeneralSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateGeneralSettings,

    onSuccess: async (updatedSettings) => {
      queryClient.setQueryData(
        generalSettingsKeys.settings(),
        updatedSettings,
      );
    },
  });
}
