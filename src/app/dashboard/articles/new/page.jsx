import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import ArticleEditor from "@/features/articles/components/ArticleEditor";
import { requireRole } from "@/lib/auth/session";

export const metadata = {
  title: "Create Article",
  robots: {
    index: false,
    follow: false,
  },
};

async function ArticleEditorContent() {
  await connection();

  try {
    await requireRole(["author", "editor", "admin"]);
  } catch (error) {
    if (error.status === 401) {
      redirect("/auth/login");
    }

    if (error.status === 403) {
      redirect("/");
    }

    throw error;
  }

  return <ArticleEditor />;
}

function ArticleEditorFallback() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="h-8 w-64 animate-pulse bg-gray-100" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-[650px] animate-pulse border border-[#e8e9ed] bg-white" />
        <div className="h-[500px] animate-pulse border border-[#e8e9ed] bg-white" />
      </div>
    </div>
  );
}

export default function NewArticlePage() {
  return (
    <Suspense fallback={<ArticleEditorFallback />}>
      <ArticleEditorContent />
    </Suspense>
  );
}
