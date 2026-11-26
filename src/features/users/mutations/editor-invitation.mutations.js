"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  acceptEditorInvitation,
  createAdminEditorInvitation,
  revokeAdminEditorInvitation,
} from "@/features/users/api/editor-invitation.api";

import { userQueryKeys } from "@/features/users/queries/user.keys";

export function useCreateEditorInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAdminEditorInvitation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: userQueryKeys.editorInvitations(),
      });
    },
  });
}

export function useRevokeEditorInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeAdminEditorInvitation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: userQueryKeys.editorInvitations(),
      });
    },
  });
}

export function useAcceptEditorInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acceptEditorInvitation,
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    },
  });
}
