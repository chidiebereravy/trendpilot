import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import ArticleManagement from "@/features/articles/components/ArticleManagement";
import { requireRole } from "@/lib/auth/session";

export const metadata = {
  title: "Article Management",
  robots: {
    index: false,
    follow: false,
  },
};

async function ArticleManagementContent() {
  await connection();

  try {
    await requireRole(["author", "editor", "admin"]);
  } catch (error) {
    if (error.status === 401) {
      redirect("/auth/login");
    }

    if (error.status === 403) {
      redirect("/");
    }

    throw error;
  }

  return <ArticleManagement />;
}

function ArticleManagementFallback() {
  return (
    <div className="container-main py-12">
      <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
      <div className="mt-6 h-40 animate-pulse rounded-xl bg-gray-100" />
    </div>
  );
}

export default function ArticleManagementPage() {
  return (
    <Suspense fallback={<ArticleManagementFallback />}>
      <ArticleManagementContent />
    </Suspense>
  );
}
