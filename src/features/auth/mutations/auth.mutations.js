"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  loginAccount,
  logoutAccount,
  registerAccount,
  requestPasswordReset,
  updatePassword,
} from "@/features/auth/api/auth.api";
import { authQueryKeys } from "@/features/auth/queries/auth.keys";

export function useRegister() {
  return useMutation({
    mutationFn: registerAccount,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: loginAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: authQueryKeys.session(),
      });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutAccount,
    onSuccess: () => {
      queryClient.setQueryData(authQueryKeys.session(), null);
      queryClient.removeQueries({
        queryKey: authQueryKeys.all,
        predicate: (query) => query.queryKey[1] !== "session",
      });
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: requestPasswordReset,
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: updatePassword,
  });
}
