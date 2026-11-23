"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteComment } from "@/features/comments/api/comment.api";
import { commentQueryKeys } from "@/features/comments/queries/comment.keys";

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteComment,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: commentQueryKeys.all,
      });
    },
  });
}
