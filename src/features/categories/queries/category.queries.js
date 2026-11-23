"use client";

import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/features/categories/api/category.api";
import { categoryQueryKeys } from "@/features/categories/queries/category.keys";

export function useCategories(filters = {}) {
  return useQuery({
    queryKey: categoryQueryKeys.list(filters),
    queryFn: () => getCategories(filters),
    staleTime: 30 * 1000,
    retry: false,
  });
}
