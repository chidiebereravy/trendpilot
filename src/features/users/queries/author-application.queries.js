"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getAdminAuthorApplications,
  getMyAuthorApplication,
} from "@/features/users/api/author-application.api";
import { userQueryKeys } from "@/features/users/queries/user.keys";

export function useAdminAuthorApplications(filters = {}) {
  return useQuery({
    queryKey: userQueryKeys.adminAuthorApplications(filters),

    queryFn: () => getAdminAuthorApplications(filters),

    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useMyAuthorApplication() {
  return useQuery({
    queryKey: userQueryKeys.myAuthorApplication(),
    queryFn: getMyAuthorApplication,
    staleTime: 30 * 1000,
    retry: false,
  });
}
