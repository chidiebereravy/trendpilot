"use client";

import { useQuery } from "@tanstack/react-query";

import { getArticleOptions } from "@/features/articles/api/article-options.api";
import { articleOptionsQueryKey } from "@/features/articles/queries/article-options.keys";

export function useArticleOptions() {
  return useQuery({
    queryKey: articleOptionsQueryKey,
    queryFn: getArticleOptions,
    staleTime: 60 * 1000,
    retry: false,
  });
}
