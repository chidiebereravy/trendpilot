"use client";
import { useQuery } from "@tanstack/react-query";

import { getAdminEditorInvitations } from "@/features/users/api/editor-invitation.api";

import { userQueryKeys } from "@/features/users/queries/user.keys";

export function useAdminEditorInvitations(filters = {}) {
  return useQuery({
    queryKey: userQueryKeys.adminEditorInvitations(filters),
    queryFn: () => getAdminEditorInvitations(filters),
    staleTime: 30_000,
    retry: false,
  });
}
