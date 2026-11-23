import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import AdvertisementsDashboard from "@/features/advertising/components/AdvertisementsDashboard";
import { requireRole } from "@/lib/auth/session";

export const metadata = {
  title: "Advertisements & Monetization",
  description:
    "Manage advertising networks, placements, sponsored campaigns, and email marketing.",
  robots: {
    index: false,
    follow: false,
  },
};

async function AdvertisementsPageContent() {
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

  return <AdvertisementsDashboard />;
}

export default function AdvertisementsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#c4a16a]" />
        </div>
      }
    >
      <AdvertisementsPageContent />
    </Suspense>
  );
}
