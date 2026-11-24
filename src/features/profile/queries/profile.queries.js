"use client";

import { useQuery } from "@tanstack/react-query";

import { getProfile } from "@/features/profile/api/profile.api";
import { profileKeys } from "@/features/profile/queries/profile.keys";

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.details(),
    queryFn: getProfile,
    staleTime: 60 * 1000,
    retry: false,
  });
}
