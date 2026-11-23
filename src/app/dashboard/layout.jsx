import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import DashboardShell from "@/features/dashboard/components/DashboardShell";

export const metadata = {
  title: {
    default: "Dashboard",
    template: "%s | TrendPilot Dashboard",
  },
  robots: {
    index: false,
    follow: false,
  },
};

async function DashboardLayoutContent({ children }) {
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

  return <DashboardShell role={profile.role}>{children}</DashboardShell>;
}

export default function DashboardLayout({ children }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#c4a16a]" />
        </div>
      }
    >
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
