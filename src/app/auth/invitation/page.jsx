import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import AcceptEditorInvitation from "@/features/users/components/AcceptEditorInvitation";

export const metadata = {
  title: "Accept Editor Invitation | TrendPilot",
  robots: {
    index: false,
    follow: false,
  },
};

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function InvitationLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4 py-12">
      <section
        className="w-full max-w-md animate-pulse rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
        aria-label="Loading invitation"
      >
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="mt-5 h-7 w-56 rounded bg-slate-200" />
        <div className="mt-4 h-4 w-full rounded bg-slate-100" />
        <div className="mt-2 h-4 w-4/5 rounded bg-slate-100" />
        <div className="mt-8 h-11 w-full rounded-lg bg-slate-200" />
      </section>
    </main>
  );
}

async function InvitationContent({ searchParams }) {
  await connection();

  const params = await searchParams;
  const token = params?.token;

  if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) {
    notFound();
  }

  let isAuthenticated = false;
  let email = null;

  try {
    const { user } = await requireAuthenticatedUser();
    isAuthenticated = true;
    email = user.email ?? null;
  } catch (error) {
    if (error.status !== 401) {
      throw error;
    }
  }

  return (
    <AcceptEditorInvitation
      token={token}
      isAuthenticated={isAuthenticated}
      email={email}
    />
  );
}

export default function EditorInvitationPage({ searchParams }) {
  return (
    <Suspense fallback={<InvitationLoading />}>
      <InvitationContent searchParams={searchParams} />
    </Suspense>
  );
}
