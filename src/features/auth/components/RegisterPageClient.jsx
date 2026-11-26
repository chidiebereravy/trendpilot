"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { RegisterForm } from "@/features/auth/components/AuthForms";

function RegisterPageContent() {
  const searchParams = useSearchParams();

  return <RegisterForm next={searchParams.get("next")} />;
}

export default function RegisterPageClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-[#f7f8fa]">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-[#e8e9ed] border-t-[#b99658]"
            role="status"
            aria-label="Loading registration page"
          />
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
