"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  archiveMedia,
  publishMedia,
  updateMediaMetadata,
  uploadMedia,
} from "@/features/media/api/media.api";
import { mediaQueryKeys } from "@/features/media/queries/media.keys";

export function useUploadMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadMedia,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: mediaQueryKeys.all,
      });
    },
  });
}

export function useUpdateMediaMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMediaMetadata,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: mediaQueryKeys.all,
      });
    },
  });
}

export function useArchiveMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveMedia,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: mediaQueryKeys.all,
      });
    },
  });
}

export function usePublishMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: publishMedia,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: mediaQueryKeys.all,
      });
    },
  });
}
