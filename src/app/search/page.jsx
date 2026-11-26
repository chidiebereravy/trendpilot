import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Search, BookOpen, ArrowRight } from "lucide-react";

import ArticleCard from "@/components/articles/ArticleCard";
import { searchPublishedArticles } from "@/lib/public-content";

export const metadata = {
  title: "Search Articles",
  description:
    "Search the TrendPilot journal for useful articles, insights and perspectives.",
  alternates: {
    canonical: "/search",
  },
  robots: {
    index: false,
    follow: true,
  },
};

function getSearchQuery(value) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  return typeof rawValue === "string" ? rawValue.trim().slice(0, 100) : "";
}

function SearchFallback() {
  return (
    <main className="min-h-screen bg-white">
      <section className="border-b border-[#e9e6df] bg-[#faf9f6]">
        <div className="container-main py-16 sm:py-20">
          <div className="mx-auto max-w-3xl animate-pulse">
            <div className="h-3 w-40 rounded bg-gray-200" />
            <div className="mt-5 h-12 max-w-lg rounded bg-gray-200" />
            <div className="mt-5 h-4 max-w-2xl rounded bg-gray-100" />
            <div className="mt-9 h-14 rounded bg-gray-100" />
          </div>
        </div>
      </section>
      <section className="container-main py-14">
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-72 animate-pulse rounded bg-gray-100"
            />
          ))}
        </div>
      </section>
    </main>
  );
}

async function SearchContent({ searchParams }) {
  await connection();

  const params = await searchParams;
  const query = getSearchQuery(params?.q);

  const articles =
    query.length >= 2
      ? await searchPublishedArticles({
          query,
          limit: 24,
        })
      : [];

  return (
    <main className="min-h-screen bg-white">
      <section className="border-b border-[#e9e6df] bg-[#faf9f6]">
        <div className="container-main py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <span className="text-[10px] font-bold tracking-[0.22em] text-[#a78348] uppercase">
              The TrendPilot Journal
            </span>

            <h1 className="mt-4 font-serif text-4xl font-medium tracking-tight text-[#14243d] sm:text-5xl">
              Search the journal.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
              Find practical knowledge, fresh perspectives and useful insights
              across the topics that matter to you.
            </p>

            <form
              action="/search"
              method="GET"
              role="search"
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <label htmlFor="article-search" className="sr-only">
                Search articles
              </label>

              <div className="flex min-h-14 flex-1 items-center gap-3 border border-[#dedbd3] bg-white px-4 transition focus-within:border-[#b99658]">
                <Search
                  size={19}
                  className="shrink-0 text-[#a78348]"
                  aria-hidden="true"
                />

                <input
                  id="article-search"
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Search articles, topics and keywords..."
                  minLength={2}
                  maxLength={100}
                  required
                  className="h-full min-w-0 flex-1 bg-transparent py-4 text-sm text-[#14243d] outline-none placeholder:text-gray-400"
                />
              </div>

              <button
                type="submit"
                className="inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 bg-[#14243d] px-8 text-xs font-bold tracking-wider text-white transition hover:bg-[#203653]"
              >
                Search
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="container-main py-14 sm:py-16">
        {!query ? (
          <div className="mx-auto max-w-xl py-12 text-center">
            <Search
              size={34}
              strokeWidth={1.5}
              className="mx-auto text-[#b99658]"
            />

            <h2 className="mt-5 font-serif text-2xl text-[#14243d]">
              What would you like to discover?
            </h2>

            <p className="mt-3 text-sm leading-7 text-gray-500">
              Enter at least two characters to search published articles by
              title, description or keyword.
            </p>

            <Link
              href="/articles"
              className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#14243d] transition hover:text-[#a78348]"
            >
              Browse all articles
              <ArrowRight size={15} />
            </Link>
          </div>
        ) : query.length < 2 ? (
          <div className="py-12 text-center">
            <h2 className="font-serif text-2xl text-[#14243d]">
              Search term too short
            </h2>

            <p className="mt-3 text-sm text-gray-500">
              Please enter at least two characters.
            </p>
          </div>
        ) : articles.length > 0 ? (
          <>
            <div className="mb-9 flex flex-wrap items-end justify-between gap-4 border-b border-[#e9e6df] pb-6">
              <div>
                <span className="text-[10px] font-bold tracking-[0.2em] text-[#a78348] uppercase">
                  Search results
                </span>

                <h2 className="mt-3 font-serif text-3xl text-[#14243d]">
                  Results for {query}
                </h2>
              </div>

              <p className="text-sm text-gray-500">
                {articles.length}{" "}
                {articles.length === 1 ? "article" : "articles"} found
              </p>
            </div>

            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>

            {articles.length === 24 && (
              <p className="mt-10 text-center text-xs text-gray-500">
                Showing the first 24 matches. Try a more specific search to
                narrow your results.
              </p>
            )}
          </>
        ) : (
          <div className="mx-auto max-w-xl py-12 text-center">
            <BookOpen
              size={34}
              strokeWidth={1.5}
              className="mx-auto text-[#b99658]"
            />

            <h2 className="mt-5 font-serif text-2xl text-[#14243d]">
              No articles found
            </h2>

            <p className="mt-3 text-sm leading-7 text-gray-500">
              We couldn&apos;t find published articles matching {query}. Try
              different words or a broader topic.
            </p>

            <Link
              href="/articles"
              className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#14243d] transition hover:text-[#a78348]"
            >
              Explore all articles
              <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

export default function SearchPage({ searchParams }) {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchContent searchParams={searchParams} />
    </Suspense>
  );
}
