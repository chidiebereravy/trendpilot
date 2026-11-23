import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import MediaManagement from "@/features/media/components/MediaManagement";

export const metadata = {
  title: "Media Library | TrendPilot",
  description: "Manage and publish your TrendPilot media assets.",
};

async function MediaPageContent() {
  await connection();

  let profile;

  try {
    const context = await requireRole(["author", "editor", "admin"]);
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

  return <MediaManagement role={profile.role} />;
}

export default function MediaPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-slate-500">
          Loading media library...
        </div>
      }
    >
      <MediaPageContent />
    </Suspense>
  );
}
