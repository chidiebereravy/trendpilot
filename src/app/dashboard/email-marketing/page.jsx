import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import EmailMarketingWorkspace from "@/features/email-marketing/components/EmailMarketingWorkspace";
import { requireRole } from "@/lib/auth/session";

export const metadata = {
  title: "Email Marketing",
  description: "Manage newsletter campaigns and email marketing.",
  robots: {
    index: false,
    follow: false,
  },
};

async function EmailMarketingPageContent() {
  await connection();

  let role;

  try {
    const context = await requireRole(["admin", "editor"]);

    role = context?.role ?? context?.profile?.role;
  } catch (error) {
    if (error.status === 401) redirect("/auth/login");
    if (error.status === 403) redirect("/");
    throw error;
  }

  return <EmailMarketingWorkspace role={role} />;
}

export default function EmailMarketingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#c4a16a]" />
        </div>
      }
    >
      <EmailMarketingPageContent />
    </Suspense>
  );
}
