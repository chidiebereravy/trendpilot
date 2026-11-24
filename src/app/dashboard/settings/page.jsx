import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import GeneralSettings from "@/features/settings/components/GeneralSettings";

export const metadata = {
  title: "General Settings",
  description: "Manage TrendPilot website identity and contact information.",
  robots: {
    index: false,
    follow: false,
  },
};

async function SettingsPageContent() {
  await connection();

  try {
    await requireRole(["admin"]);
  } catch (error) {
    if (error?.status === 401) {
      redirect("/auth/login");
    }

    if (error?.status === 403) {
      redirect("/");
    }

    throw error;
  }

  return <GeneralSettings />;
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[360px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#c4a16a]" />
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
