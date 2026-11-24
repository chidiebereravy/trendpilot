"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  updateProfile,
  changeProfilePassword,
} from "@/features/profile/api/profile.api";
import { profileKeys } from "@/features/profile/queries/profile.keys";

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,

    onSuccess: async (updatedProfile) => {
      queryClient.setQueryData(profileKeys.details(), (current) => ({
        ...current,
        ...updatedProfile,
      }));
    },
  });
}

export function useChangeProfilePassword() {
  return useMutation({
    mutationFn: changeProfilePassword,
  });
}
