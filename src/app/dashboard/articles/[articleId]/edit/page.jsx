import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import ArticleEditor from "@/features/articles/components/ArticleEditor";
import { articleIdSchema } from "@/features/articles/schemas/article.schema";
import { requireRole } from "@/lib/auth/session";

export const metadata = {
  title: "Edit Article",
  robots: {
    index: false,
    follow: false,
  },
};

async function EditArticleContent({ articleId }) {
  await connection();

  if (!articleIdSchema.safeParse(articleId).success) {
    notFound();
  }

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

  return <ArticleEditor articleId={articleId} />;
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

async function EditArticleParams({ params }) {
  const { articleId } = await params;

  return <EditArticleContent articleId={articleId} />;
}

export default function EditArticlePage({ params }) {
  return (
    <Suspense fallback={<ArticleEditorFallback />}>
      <EditArticleParams params={params} />
    </Suspense>
  );
}
