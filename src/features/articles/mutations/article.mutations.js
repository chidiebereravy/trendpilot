"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createArticle,
  updateArticle,
  deleteArticle,
} from "@/features/articles/api/article.api";

import { articleQueryKeys } from "@/features/articles/queries/article.keys";

export function useCreateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createArticle,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: articleQueryKeys.all,
      });
    },
  });
}

export function useUpdateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ articleId, payload }) => updateArticle(articleId, payload),

    onSuccess: async (updatedArticle) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: articleQueryKeys.all,
        }),

        queryClient.setQueryData(
          articleQueryKeys.detail(updatedArticle.id),
          updatedArticle,
        ),
      ]);
    },
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteArticle,

    onSuccess: async (_, articleId) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: articleQueryKeys.all,
        }),

        queryClient.removeQueries({
          queryKey: articleQueryKeys.detail(articleId),
        }),
      ]);
    },
  });
}
