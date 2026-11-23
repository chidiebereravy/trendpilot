import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import AffiliateLinksDashboard from "@/features/affiliate/components/AffiliateLinksDashboard";

export const metadata = {
  title: "Affiliate Links",
  description:
    "Manage affiliate programs, recommendation links, approvals, and tracking in TrendPilot.",
  robots: {
    index: false,
    follow: false,
  },
};

function AffiliateLinksLoading() {
  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-7 px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-44 animate-pulse rounded-3xl bg-slate-100" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}

async function AffiliateLinksPageContent() {
  await connection();

  let profile;

  try {
    const result = await requireRole(["admin", "editor"]);
    profile = result.profile;
  } catch (error) {
    if (error.status === 401) {
      redirect("/auth/login");
    }

    if (error.status === 403) {
      redirect("/");
    }

    throw error;
  }

  return <AffiliateLinksDashboard role={profile.role} />;
}

export default function AffiliateLinksPage() {
  return (
    <Suspense fallback={<AffiliateLinksLoading />}>
      <AffiliateLinksPageContent />
    </Suspense>
  );
}
