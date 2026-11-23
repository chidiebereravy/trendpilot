"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateDashboardUserRole } from "@/features/users/api/user.api";
import { userQueryKeys } from "@/features/users/queries/user.keys";

export function useUpdateDashboardUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }) =>
      updateDashboardUserRole(userId, { role }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: userQueryKeys.all,
      });
    },
  });
}
