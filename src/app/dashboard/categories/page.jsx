import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import CategoryManagement from "@/features/categories/components/CategoryManagement";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

async function CategoryManagementContent() {
  await connection();

  try {
    await requireRole(["admin"]);
  } catch (error) {
    if (error.status === 401) {
      redirect("/auth/login");
    }

    if (error.status === 403) {
      redirect("/");
    }

    throw error;
  }

  return <CategoryManagement />;
}

function CategoryManagementFallback() {
  return (
    <div className="container-main py-12">
      <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
      <div className="mt-6 h-40 animate-pulse rounded-xl bg-gray-100" />
    </div>
  );
}

export default function CategoryManagementPage() {
  return (
    <Suspense fallback={<CategoryManagementFallback />}>
      <CategoryManagementContent />
    </Suspense>
  );
}
