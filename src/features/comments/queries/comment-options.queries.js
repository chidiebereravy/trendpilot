"use client";

import { useQuery } from "@tanstack/react-query";

import { getDashboardCommentOptions } from "@/features/comments/api/comment.api";
import { commentQueryKeys } from "@/features/comments/queries/comment.keys";

export function useDashboardCommentOptions() {
  return useQuery({
    queryKey: commentQueryKeys.options(),
    queryFn: getDashboardCommentOptions,
    staleTime: 60 * 1000,
    retry: false,
  });
}
