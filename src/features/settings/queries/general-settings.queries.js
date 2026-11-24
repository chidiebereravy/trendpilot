"use client";

import { useQuery } from "@tanstack/react-query";

import { getGeneralSettings } from "@/features/settings/api/general-settings.api";
import { generalSettingsKeys } from "@/features/settings/queries/general-settings.keys";

export function useGeneralSettings() {
  return useQuery({
    queryKey: generalSettingsKeys.settings(),
    queryFn: getGeneralSettings,
    staleTime: 60 * 1000,
    retry: false,
  });
}
