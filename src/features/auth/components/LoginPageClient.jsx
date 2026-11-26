"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { LoginForm } from "@/features/auth/components/AuthForms";

function LoginPageContent() {
  const searchParams = useSearchParams();

  return (
    <LoginForm
      verified={searchParams.get("verified") === "1"}
      passwordUpdated={searchParams.get("password") === "updated"}
      confirmationError={searchParams.get("error")}
      next={searchParams.get("next")}
    />
  );
}

export default function LoginPageClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-[#f7f8fa]">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-[#e8e9ed] border-t-[#b99658]"
            role="status"
            aria-label="Loading sign-in page"
          />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
