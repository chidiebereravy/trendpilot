"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/features/categories/api/category.api";

import { categoryQueryKeys } from "@/features/categories/queries/category.keys";

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: categoryQueryKeys.all,
      });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryId, payload }) =>
      updateCategory(categoryId, payload),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: categoryQueryKeys.all,
      });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCategory,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: categoryQueryKeys.all,
      });
    },
  });
}
