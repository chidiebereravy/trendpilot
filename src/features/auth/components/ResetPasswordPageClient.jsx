"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ResetPasswordForm } from "@/features/auth/components/AuthForms";

function ResetPasswordPageContent() {
  const searchParams = useSearchParams();

  return <ResetPasswordForm linkError={searchParams.get("error")} />;
}

export default function ResetPasswordPageClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-[#f7f8fa]">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-[#e8e9ed] border-t-[#b99658]"
            role="status"
            aria-label="Loading password reset page"
          />
        </div>
      }
    >
      <ResetPasswordPageContent />
    </Suspense>
  );
}
