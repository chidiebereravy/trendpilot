import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import AuthorApplicationsManager from "@/features/users/components/AuthorApplicationsManager";
import { requireRole } from "@/lib/auth/session";

export const metadata = {
  title: "Author Applications",
  robots: {
    index: false,
    follow: false,
  },
};

async function AuthorApplicationsContent() {
  await connection();

  try {
    await requireRole(["admin"]);
  } catch (error) {
    if (error.status === 401) redirect("/auth/login");
    if (error.status === 403) redirect("/");
    throw error;
  }

  return <AuthorApplicationsManager />;
}

export default function AuthorApplicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="container-main py-12">
          <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
          <div className="mt-6 h-96 animate-pulse rounded-xl bg-gray-100" />
        </div>
      }
    >
      <AuthorApplicationsContent />
    </Suspense>
  );
}
