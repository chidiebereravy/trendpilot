"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createArticleComment } from "@/features/comments/api/comment.api";
import { commentQueryKeys } from "@/features/comments/queries/comment.keys";

export function useCreateArticleComment(slug) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createArticleComment(slug, payload),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: commentQueryKeys.all,
      });
    },
  });
}
