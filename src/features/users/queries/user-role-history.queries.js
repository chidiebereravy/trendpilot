"use client";

import { useQuery } from "@tanstack/react-query";

import { getUserRoleHistory } from "@/features/users/api/user-role-history.api";
import { userQueryKeys } from "@/features/users/queries/user.keys";

export function useUserRoleHistory(filters = {}) {
  return useQuery({
    queryKey: userQueryKeys.adminRoleHistory(filters),
    queryFn: () => getUserRoleHistory(filters),
    staleTime: 30 * 1000,
    retry: false,
  });
}
