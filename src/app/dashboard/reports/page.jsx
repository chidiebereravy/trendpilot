import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import ReportsDashboard from "@/features/reports/components/ReportsDashboard";
import { requireRole } from "@/lib/auth/session";

export const metadata = {
  title: "Reports",
  description: "Detailed editorial, community, user, and category reports.",
  robots: {
    index: false,
    follow: false,
  },
};

async function ReportsPageContent() {
  await connection();

  let profile;

  try {
    const context = await requireRole(["admin", "editor"]);
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

  return <ReportsDashboard role={profile.role} />;
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#c4a16a]" />
        </div>
      }
    >
      <ReportsPageContent />
    </Suspense>
  );
}
