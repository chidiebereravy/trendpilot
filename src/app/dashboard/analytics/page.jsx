import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import AnalyticsDashboard from "@/features/analytics/components/AnalyticsDashboard";

export const metadata = {
  title: "Analytics",
  description: "Editorial performance and publishing analytics.",
  robots: {
    index: false,
    follow: false,
  },
};

async function AnalyticsPageContent() {
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

  return <AnalyticsDashboard />;
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#c4a16a]" />
        </div>
      }
    >
      <AnalyticsPageContent />
    </Suspense>
  );
}
