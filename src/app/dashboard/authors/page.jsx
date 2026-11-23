import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import AuthorManagement from "@/features/authors/components/AuthorManagement";
import { requireRole } from "@/lib/auth/session";

export const metadata = {
  title: "Authors",
  robots: {
    index: false,
    follow: false,
  },
};

async function AuthorManagementContent() {
  await connection();

  try {
    await requireRole(["admin", "editor"]);
  } catch (error) {
    if (error.status === 401) {
      redirect("/auth/login");
    }

    if (error.status === 403) {
      redirect("/");
    }

    throw error;
  }

  return <AuthorManagement />;
}

function AuthorManagementFallback() {
  return (
    <div className="container-main py-12">
      <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
      <div className="mt-6 h-40 animate-pulse rounded-xl bg-gray-100" />
    </div>
  );
}

export default function AuthorManagementPage() {
  return (
    <Suspense fallback={<AuthorManagementFallback />}>
      <AuthorManagementContent />
    </Suspense>
  );
}
