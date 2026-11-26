import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import AuthorApplicationForm from "@/features/users/components/AuthorApplicationForm";
import { requireAuthenticatedUser } from "@/lib/auth/session";

export const metadata = {
  title: "Apply to Become an Author",
  robots: {
    index: false,
    follow: false,
  },
};

async function AuthorApplicationContent() {
  await connection();

  try {
    const { profile } = await requireAuthenticatedUser();

    if (profile?.role !== "user") {
      redirect("/");
    }
  } catch (error) {
    if (error.status === 401) redirect("/auth/login");
    if (error.status === 403) redirect("/");
    throw error;
  }

  return <AuthorApplicationForm />;
}

export default function AuthorApplicationPage() {
  return (
    <Suspense
      fallback={
        <div className="container-main py-12">
          <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
          <div className="mt-6 h-96 animate-pulse rounded-xl bg-gray-100" />
        </div>
      }
    >
      <AuthorApplicationContent />
    </Suspense>
  );
}
