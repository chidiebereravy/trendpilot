"use client";

import { useQuery } from "@tanstack/react-query";
import { getAuthSession } from "@/features/auth/api/auth.api";
import { authQueryKeys } from "@/features/auth/queries/auth.keys";

export function useAuthSession() {
  return useQuery({
    queryKey: authQueryKeys.session(),
    queryFn: getAuthSession,
    retry: false,
    staleTime: 30 * 1000,
  });
}
