"use client";

import { useQuery } from "@tanstack/react-query";

import { getMedia } from "@/features/media/api/media.api";
import { mediaQueryKeys } from "@/features/media/queries/media.keys";

export function useMedia(filters = {}, enabled = true) {
  return useQuery({
    queryKey: mediaQueryKeys.list(filters),
    queryFn: () => getMedia(filters),
    staleTime: 30 * 1000,
    retry: false,
    enabled,
  });
}
