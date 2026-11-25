import { ArrowRight, BookOpen, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Fragment, Suspense } from "react";
import { getPublicSeoSettings } from "@/lib/seo-settings";

import ArticleCard from "@/components/articles/ArticleCard";
import AdPlacement from "@/components/advertising/AdPlacement";
import {
  getCategoryDescendantMicroIds,
  getCategoryUrl,
  getPublishedArticlesPage,
  getPublishedCategories,
  getPublishedCategoryPath,
  getCategoryPathname,
} from "@/lib/public-content";

async function getCategoryPageData(slugs, page) {
  const category = await getPublishedCategoryPath(slugs);

  if (!category) {
    return null;
  }

  const categories = await getPublishedCategories();

  const childCategories = categories.filter(
    (item) => item.parent_id === category.id,
  );

  const microCategoryIds =
    category.level === "micro"
      ? [category.id]
      : getCategoryDescendantMicroIds(category, categories);

  const articleResult = await getPublishedArticlesPage({
    page,
    pageSize: 12,
    categoryIds: microCategoryIds,
  });

  const categoryPath = [];
  let current = category;

  while (current) {
    categoryPath.unshift(current);

    if (!current.parent_id) break;

    current = categories.find((item) => item.id === current.parent_id);

    if (!current) return null;
  }

  return {
    category,
    categories,
    childCategories,
    articles: articleResult.articles,
    totalArticles: articleResult.total,
    currentPage: articleResult.page,
    pageSize: articleResult.pageSize,
    totalPages: articleResult.totalPages,
    categoryPath,
  };
}

export async function generateMetadata({ params, searchParams }) {
  await connection();

  const [{ slug }, query] = await Promise.all([params, searchParams]);

  const slugs = Array.isArray(slug) ? slug : [slug];

  const pageValue = Array.isArray(query?.page) ? query.page[0] : query?.page;

  const parsedPage = Number(pageValue);

  const page =
    Number.isSafeInteger(parsedPage) && parsedPage > 1 ? parsedPage : 1;

  const [category, settings] = await Promise.all([
    getPublishedCategoryPath(slugs),
    getPublicSeoSettings(),
  ]);

  if (!category) {
    return {
      title: "Category Not Found",
      robots: { index: false, follow: false },
    };
  }

  const title = category.seo_title || category.name;

  const description =
    category.seo_description ||
    category.description ||
    `Explore articles, insights and practical perspectives about ${category.name} on ${settings.site_name}.`;

  const socialImages = settings.default_social_image_url
    ? [settings.default_social_image_url]
    : undefined;

  const categoryPath = getCategoryPathname(slugs);

  const canonical = page > 1 ? `${categoryPath}?page=${page}` : categoryPath;

  return {
    title,
    description,

    alternates: {
      canonical,
    },

    robots: {
      index: settings.search_indexing_enabled,
      follow: settings.search_indexing_enabled,
    },

    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: settings.site_name,
      ...(socialImages ? { images: socialImages } : {}),
    },

    twitter: {
      card: socialImages ? "summary_large_image" : "summary",
      title,
      description,
      ...(socialImages ? { images: socialImages } : {}),
    },
  };
}

function CategoryCard({ category, categories }) {
  return (
    <Link
      href={getCategoryUrl(category, categories)}
      className="group flex items-center justify-between border border-[#e9e6df] bg-white p-5 transition hover:border-[#b99658] hover:shadow-sm"
    >
      <div>
        <span className="mb-2 block text-[10px] font-semibold tracking-[0.2em] text-[#b18a4a] uppercase">
          {category.level === "micro"
            ? "Micro niche"
            : category.level === "subcategory"
              ? "Subcategory"
              : "Broad niche"}
        </span>

        <h2 className="font-serif text-xl text-[#14243d]">{category.name}</h2>

        {category.description && (
          <p className="mt-2 max-w-lg text-sm leading-6 text-[#737987]">
            {category.description}
          </p>
        )}
      </div>

      <ArrowRight
        size={18}
        className="shrink-0 text-[#b99658] transition group-hover:translate-x-1"
      />
    </Link>
  );
}

async function CategoryContent({ params, searchParams }) {
  await connection();

  const { slug } = await params;
  const { page: requestedPage } = await searchParams;

  const slugs = Array.isArray(slug) ? slug : [slug];

  const pageValue = Array.isArray(requestedPage)
    ? requestedPage[0]
    : requestedPage;

  const parsedPage = Number(pageValue);

  const page =
    Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const data = await getCategoryPageData(slugs, page);

  if (!data) {
    notFound();
  }

  const {
    category,
    categories,
    childCategories,
    articles,
    totalArticles,
    currentPage,
    totalPages,
    categoryPath,
  } = data;

  const categoryUrl = getCategoryPathname(slugs);

  if (currentPage > totalPages) {
    redirect(
      totalPages > 1 ? `${categoryUrl}?page=${totalPages}` : categoryUrl,
    );
  }

  const levelLabel =
    category.level === "broad"
      ? "Explore a broad niche"
      : category.level === "subcategory"
        ? "Explore a subcategory"
        : "Explore a micro niche";

  return (
    <main className="min-h-screen bg-white">
      <section
        className="relative isolate overflow-hidden bg-[#101d30] bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(12, 25, 43, 0.97) 0%, rgba(12, 25, 43, 0.83) 58%, rgba(12, 25, 43, 0.48) 100%), url('/images/trendpilot-hero.png')",
        }}
      >
        <div className="container-main relative py-20 sm:py-24 lg:py-28">
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex flex-wrap items-center gap-2 text-xs text-white/65"
          >
            <Link href="/" className="transition hover:text-white">
              Home
            </Link>

            <ChevronRight size={13} />

            <Link href="/articles" className="transition hover:text-white">
              Journal
            </Link>

            {categoryPath.map((item) => (
              <span key={item.id} className="flex items-center gap-2">
                <ChevronRight size={13} />
                <Link
                  href={getCategoryUrl(item, categories)}
                  className="transition hover:text-white"
                >
                  {item.name}
                </Link>
              </span>
            ))}
          </nav>

          <div className="max-w-3xl">
            <div className="mb-5 flex items-center gap-3">
              <span className="text-[10px] font-semibold tracking-[0.24em] text-[#d9b878] uppercase">
                {levelLabel}
              </span>
            </div>

            <h1 className="font-serif text-5xl leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
              {category.name}
              <span className="text-[#d9b878]">.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
              {category.description ||
                `Discover useful knowledge, fresh perspectives and meaningful opportunities in ${category.name}.`}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-5 text-xs text-white/65">
              <span className="flex items-center gap-2">
                <BookOpen size={15} />
                {totalArticles} published{" "}
                {totalArticles === 1 ? "article" : "articles"}
              </span>

              {childCategories.length > 0 && (
                <span>
                  {childCategories.length}{" "}
                  {childCategories.length === 1 ? "topic" : "topics"}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {childCategories.length > 0 && (
        <section className="container-main py-14 sm:py-16">
          <div className="mb-8">
            <span className="text-[10px] font-semibold tracking-[0.2em] text-[#b18a4a] uppercase">
              Explore further
            </span>

            <h2 className="editorial-heading mt-3 font-serif text-3xl text-[#14243d] sm:text-4xl">
              Explore related topics
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#737987]">
              Browse the topics within {category.name} and discover more focused
              areas of knowledge.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {childCategories.map((child) => (
              <CategoryCard
                key={child.id}
                category={child}
                categories={categories}
              />
            ))}
          </div>
        </section>
      )}

      <section className="container-main pt-8 pb-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[#e9e6df] pb-6">
          <div>
            <span className="text-[10px] font-semibold tracking-[0.2em] text-[#b18a4a] uppercase">
              The TrendPilot journal
            </span>

            <h2 className="editorial-heading mt-3 font-serif text-3xl text-[#14243d] sm:text-4xl">
              Latest publications
            </h2>
          </div>

          <span className="text-xs text-[#737987]">
            {totalArticles} {totalArticles === 1 ? "article" : "articles"}{" "}
            available
          </span>
        </div>

        {articles.length > 0 ? (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, index) => (
              <Fragment key={article.id}>
                <ArticleCard article={article} />
                {index === 2 && articles.length > 3 && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <AdPlacement placementKey="category_feed" />
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-[#e5e0d6] bg-[#fcfbf9] px-6 py-16 text-center">
            <BookOpen
              size={30}
              className="mx-auto text-[#b99658]"
              strokeWidth={1.5}
            />

            <h3 className="mt-5 font-semibold text-[#14243d]">
              No published articles yet
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#737987]">
              New stories in this topic will appear here as soon as they are
              reviewed and published by the TrendPilot editorial team.
            </p>

            <Link
              href="/articles"
              className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-[#14243d] transition hover:text-[#b18a4a]"
            >
              Explore all articles
              <ArrowRight size={15} />
            </Link>
          </div>
        )}

        {totalPages > 1 && (
          <nav
            aria-label="Article pagination"
            className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[#e9e6df] pt-7"
          >
            <Link
              href={
                currentPage > 2
                  ? `${categoryUrl}?page=${currentPage - 1}`
                  : categoryUrl
              }
              aria-disabled={currentPage === 1}
              tabIndex={currentPage === 1 ? -1 : undefined}
              className={`inline-flex items-center gap-2 text-sm font-medium transition ${
                currentPage === 1
                  ? "pointer-events-none text-[#b9b9b9]"
                  : "text-[#14243d] hover:text-[#b18a4a]"
              }`}
            >
              <ArrowRight size={16} className="rotate-180" />
              Previous
            </Link>

            <span className="text-sm text-[#737987]">
              Page {currentPage} of {totalPages}
            </span>

            <Link
              href={`${categoryUrl}?page=${currentPage + 1}`}
              aria-disabled={currentPage === totalPages}
              tabIndex={currentPage === totalPages ? -1 : undefined}
              className={`inline-flex items-center gap-2 text-sm font-medium transition ${
                currentPage === totalPages
                  ? "pointer-events-none text-[#b9b9b9]"
                  : "text-[#14243d] hover:text-[#b18a4a]"
              }`}
            >
              Next
              <ArrowRight size={16} />
            </Link>
          </nav>
        )}
      </section>
    </main>
  );
}

function CategoryLoading() {
  return (
    <main className="min-h-screen animate-pulse bg-white">
      <div className="h-[390px] bg-[#14243d]" />
      <div className="container-main py-16">
        <div className="h-8 w-64 bg-[#eeeae3]" />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="h-28 bg-[#f4f2ee]" />
          <div className="h-28 bg-[#f4f2ee]" />
        </div>
      </div>
    </main>
  );
}

export default function CategoryPage({ params, searchParams }) {
  return (
    <Suspense fallback={<CategoryLoading />}>
      <CategoryContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
