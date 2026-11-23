import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import CommentManagement from "@/features/comments/components/CommentManagement";
import { requireRole } from "@/lib/auth/session";

export const metadata = {
  title: "Comment Management",
  robots: {
    index: false,
    follow: false,
  },
};

async function CommentManagementContent() {
  await connection();

  let user;
  let profile;

  try {
    const context = await requireRole(["author", "editor", "admin"]);
    user = context.user;
    profile = context.profile;
  } catch (error) {
    if (error.status === 401) {
      redirect("/auth/login");
    }

    if (error.status === 403) {
      redirect("/");
    }

    throw error;
  }

  return <CommentManagement currentUserId={user.id} role={profile.role} />;
}

function CommentManagementFallback() {
  return (
    <div className="container-main py-12">
      <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
      <div className="mt-6 h-40 animate-pulse rounded-xl bg-gray-100" />
    </div>
  );
}

export default function CommentManagementPage() {
  return (
    <Suspense fallback={<CommentManagementFallback />}>
      <CommentManagementContent />
    </Suspense>
  );
}
