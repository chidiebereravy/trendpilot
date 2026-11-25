import Link from "next/link";
import { Fragment, Suspense } from "react";
import { connection } from "next/server";
import { ArrowRight, BookOpen } from "lucide-react";
import ArticleCard from "@/components/articles/ArticleCard";
import AdPlacement from "@/components/advertising/AdPlacement";
import { getPublicSeoSettings } from "@/lib/seo-settings";
import {
  getPublishedArticles,
  getPublishedCategories,
} from "@/lib/public-content";

export async function generateMetadata() {
  const settings = await getPublicSeoSettings();

  return {
    title: "Articles and Insights",
    description:
      "Explore practical guides, thoughtful perspectives and useful insights across business, technology, finance, education, lifestyle and innovation.",

    alternates: {
      canonical: "/articles",
    },

    robots: {
      index: settings.search_indexing_enabled,
      follow: settings.search_indexing_enabled,
    },

    openGraph: {
      siteName: settings.site_name,
      title: "Articles and Insights",
      description:
        "Explore practical guides, thoughtful perspectives and useful insights across business, technology, finance, education, lifestyle and innovation.",
    },
  };
}

async function ArticlesContent() {
  await connection();
  const [articles, categories] = await Promise.all([
    getPublishedArticles({ limit: 24 }),
    getPublishedCategories(),
  ]);

  const broadNiches = categories.filter(
    (category) => category.level === "broad",
  );

  return (
    <main className="min-h-screen bg-white">
      <section
        className="relative isolate overflow-hidden bg-[#101d30] text-white"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(10, 23, 40, 0.96) 0%, rgba(16, 29, 48, 0.86) 55%, rgba(16, 29, 48, 0.48) 100%), url('/images/trendpilot-hero.png')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#101d30]/60 via-transparent to-transparent" />

        <div className="container-main relative py-24 sm:py-32 lg:py-36">
          <span className="inline-flex items-center gap-3 text-[10px] font-bold tracking-[0.28em] text-[#d5b77e] uppercase">
            <span className="h-px w-8 bg-[#d5b77e]" />
            The TrendPilot Journal
          </span>

          <h1 className="mt-7 max-w-4xl font-serif text-5xl leading-[1.12] font-medium tracking-[-0.035em] text-white sm:text-6xl lg:text-7xl">
            Ideas that inspire.
            <span className="block text-[#d5b77e] italic">
              Insights that move you forward.
            </span>
          </h1>

          <p className="mt-8 max-w-2xl text-sm leading-8 text-white/75 sm:text-base">
            Discover useful knowledge, fresh perspectives and meaningful
            opportunities across business, technology, finance, education,
            lifestyle and innovation.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link
              href="#latest-publications"
              className="inline-flex items-center gap-3 bg-[#b99658] px-7 py-4 text-xs font-bold tracking-wider text-[#101d30] transition hover:bg-[#d5b77e]"
            >
              Explore the journal
              <ArrowRight size={16} />
            </Link>

            <span className="text-xs tracking-wide text-white/65">
              Independent ideas. Meaningful insights.
            </span>
          </div>
        </div>
      </section>

      <section className="border-b border-[#eeeae2] bg-[#fcfbf9]">
        <div className="container-main flex flex-wrap gap-3 py-6">
          {broadNiches.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="category-pill"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section
        id="latest-publications"
        className="container-main scroll-mt-24 py-14 sm:py-18"
      >
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#a78348] uppercase">
              Latest publications
            </span>
            <h2 className="editorial-heading mt-3 font-serif text-3xl font-medium tracking-tight text-[#14243d] sm:text-4xl">
              Explore the journal
            </h2>
          </div>
          <p className="text-sm text-gray-500">
            {articles.length} {articles.length === 1 ? "article" : "articles"}{" "}
            available
          </p>
        </div>

        {articles.length ? (
          <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, index) => (
              <Fragment key={article.id}>
                <ArticleCard article={article} />
                {index === 2 && articles.length > 3 && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <AdPlacement placementKey="article_feed" />
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-[#dedbd3] bg-[#fcfbf9] px-6 py-16 text-center">
            <BookOpen className="mx-auto text-[#b99658]" size={30} />
            <h2 className="mt-5 text-xl font-bold text-[#14243d]">
              New stories are on the way.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-gray-500">
              Our journal will feature articles as soon as they are reviewed and
              published by the TrendPilot editorial team.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#14243d] hover:text-[#a78348]"
            >
              Return to homepage
              <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

export default function ArticlesPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white">
          <div className="container-main py-20">
            <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-100" />
            <div className="mt-4 h-5 w-full max-w-xl animate-pulse rounded bg-slate-100" />

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="h-56 rounded-2xl bg-slate-100" />
                  <div className="mt-5 h-4 w-24 rounded bg-slate-100" />
                  <div className="mt-3 h-6 w-full rounded bg-slate-100" />
                  <div className="mt-2 h-4 w-4/5 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </main>
      }
    >
      <ArticlesContent />
    </Suspense>
  );
}
