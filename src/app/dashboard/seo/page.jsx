import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import SeoDashboard from "@/features/seo/components/SeoDashboard";

export const metadata = {
  title: "SEO Settings",
  description: "Manage TrendPilot search visibility and SEO defaults.",
  robots: {
    index: false,
    follow: false,
  },
};

async function SeoPageContent() {
  await connection();

  try {
    await requireRole(["admin", "editor"]);
  } catch (error) {
    if (error?.status === 401) {
      redirect("/auth/login");
    }

    if (error?.status === 403) {
      redirect("/");
    }

    throw error;
  }

  return <SeoDashboard />;
}

export default function SeoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[360px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#c4a16a]" />
        </div>
      }
    >
      <SeoPageContent />
    </Suspense>
  );
}
