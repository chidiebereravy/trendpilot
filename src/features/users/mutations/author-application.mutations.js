"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  reviewAuthorApplication,
  submitAuthorApplication,
} from "@/features/users/api/author-application.api";
import { userQueryKeys } from "@/features/users/queries/user.keys";

export function useSubmitAuthorApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitAuthorApplication,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: userQueryKeys.authorApplications(),
      });
    },
  });
}

export function useReviewAuthorApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ applicationId, decision, reviewNote }) =>
      reviewAuthorApplication(applicationId, {
        decision,
        reviewNote,
      }),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: userQueryKeys.authorApplications(),
        }),
        queryClient.invalidateQueries({
          queryKey: userQueryKeys.all,
        }),
      ]);
    },
  });
}
