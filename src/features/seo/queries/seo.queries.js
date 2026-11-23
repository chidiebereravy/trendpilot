"use client";

import { useQuery } from "@tanstack/react-query";

import { getSeoSettings } from "@/features/seo/api/seo.api";
import { seoKeys } from "@/features/seo/queries/seo.keys";

export function useSeoSettings() {
  return useQuery({
    queryKey: seoKeys.settings(),
    queryFn: getSeoSettings,
    staleTime: 60 * 1000,
    retry: false,
  });
}
