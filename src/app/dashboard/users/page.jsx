import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import UserManagement from "@/features/users/components/UserManagement";
import { requireRole } from "@/lib/auth/session";

export const metadata = {
  title: "User Management",
  robots: {
    index: false,
    follow: false,
  },
};

async function UserManagementContent() {
  await connection();

  let user;

  try {
    const context = await requireRole(["admin"]);
    user = context.user;
  } catch (error) {
    if (error.status === 401) {
      redirect("/auth/login");
    }

    if (error.status === 403) {
      redirect("/");
    }

    throw error;
  }

  return <UserManagement currentUserId={user.id} />;
}

function UserManagementFallback() {
  return (
    <div className="container-main py-12">
      <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
      <div className="mt-6 h-40 animate-pulse rounded-xl bg-gray-100" />
    </div>
  );
}

export default function UserManagementPage() {
  return (
    <Suspense fallback={<UserManagementFallback />}>
      <UserManagementContent />
    </Suspense>
  );
}
