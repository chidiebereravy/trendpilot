"use client";

import { useQuery } from "@tanstack/react-query";

import { getArticle, getArticles } from "@/features/articles/api/article.api";

import { articleQueryKeys } from "@/features/articles/queries/article.keys";

export function useArticles(filters = {}) {
  return useQuery({
    queryKey: articleQueryKeys.list(filters),
    queryFn: () => getArticles(filters),
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useArticle(articleId, options = {}) {
  return useQuery({
    queryKey: articleQueryKeys.detail(articleId),
    queryFn: () => getArticle(articleId),
    enabled: Boolean(articleId) && (options.enabled ?? true),
    staleTime: 30 * 1000,
    retry: false,
  });
}
