import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight, Clock3, CalendarDays } from "lucide-react";
import { getPublicSeoSettings, getSiteUrl } from "@/lib/seo-settings";
import ArticleShareButton from "@/features/articles/components/ArticleShareButton";

import ArticleCard from "@/components/articles/ArticleCard";
import AdPlacement from "@/components/advertising/AdPlacement";
import ArticleDocument from "@/components/articles/ArticleDocument";
import PublicCommentThread from "@/features/comments/components/PublicCommentThread";
import { getPublicAffiliatePlacements } from "@/lib/public-affiliate";
import {
  getPublishedArticleBySlug,
  getPublishedArticles,
} from "@/lib/public-content";
import { formatDate, formatReadingTime } from "@/lib/utils";

function getArticleCanonicalUrl(article) {
  const siteUrl = getSiteUrl();

  const fallbackUrl = new URL(
    `/articles/${encodeURIComponent(article.slug)}`,
    `${siteUrl}/`,
  ).toString();

  if (
    typeof article.canonical_url !== "string" ||
    !article.canonical_url.trim()
  ) {
    return fallbackUrl;
  }

  try {
    const canonicalUrl = new URL(article.canonical_url.trim());

    if (
      !["http:", "https:"].includes(canonicalUrl.protocol) ||
      !canonicalUrl.hostname ||
      canonicalUrl.username ||
      canonicalUrl.password
    ) {
      return fallbackUrl;
    }

    return canonicalUrl.toString();
  } catch {
    return fallbackUrl;
  }
}

function getArticleFaqItems(content) {
  const blocks = Array.isArray(content?.content) ? content.content : [];

  return blocks.flatMap((block) => {
    if (block.type !== "faqSection" || !Array.isArray(block.attrs?.items)) {
      return [];
    }

    return block.attrs.items
      .filter(
        (item) =>
          typeof item.question === "string" &&
          item.question.trim().length > 0 &&
          typeof item.answer === "string" &&
          item.answer.trim().length > 0,
      )
      .map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      }));
  });
}

async function getArticlePageData(slug) {
  const article = await getPublishedArticleBySlug(slug);

  if (!article) return null;

  const relatedResults = await getPublishedArticles({
    limit: 6,
    categoryIds: [article.category_id],
  });

  const relatedArticles = relatedResults
    .filter((item) => item.id !== article.id)
    .slice(0, 3);

  return { article, relatedArticles };
}

export async function generateMetadata({ params }) {
  await connection();

  const { slug } = await params;

  const [article, settings] = await Promise.all([
    getPublishedArticleBySlug(slug),
    getPublicSeoSettings(),
  ]);

  if (!article) {
    notFound();
  }

  const title = article.seo_title || article.title;
  const description =
    article.seo_description || article.excerptText || article.title;

  const canonical = getArticleCanonicalUrl(article);

  const shouldIndex = settings.search_indexing_enabled && !article.no_index;

  return {
    title,
    description,
    alternates: { canonical },
    keywords: article.focus_keyword ? [article.focus_keyword] : undefined,

    robots: {
      index: shouldIndex,
      follow: shouldIndex ? true : false,
    },

    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      siteName: settings.site_name,
      publishedTime: article.published_at,
      images: article.imageUrl
        ? [
            {
              url: article.imageUrl,
              alt: article.title,
              width: 1200,
              height: 630,
            },
          ]
        : undefined,
    },

    twitter: {
      card: article.imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: article.imageUrl ? [article.imageUrl] : undefined,
    },
  };
}

function ArticleLoading() {
  return (
    <div className="container-main min-h-[60vh] py-20">
      <div className="mx-auto max-w-4xl animate-pulse">
        <div className="mb-6 h-4 w-40 rounded bg-gray-200" />
        <div className="mb-4 h-12 max-w-3xl rounded bg-gray-200" />
        <div className="mb-10 h-5 max-w-xl rounded bg-gray-200" />
        <div className="aspect-[16/9] rounded-2xl bg-gray-200" />
      </div>
    </div>
  );
}

async function ArticleContent({ params }) {
  await connection();

  const { slug } = await params;

  const [data, settings] = await Promise.all([
    getArticlePageData(slug),
    getPublicSeoSettings(),
  ]);

  if (!data) notFound();

  const { article, relatedArticles } = data;

  const affiliatePlacements = await getPublicAffiliatePlacements(article.id);

  const canonicalUrl = getArticleCanonicalUrl(article);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerptText,
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,

    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },

    image: article.imageUrl ? [article.imageUrl] : undefined,

    author: {
      "@type": "Organization",
      name: settings.site_name,
    },
    publisher: {
      "@type": "Organization",
      name: settings.site_name,
    },
  };

  const faqItems = getArticleFaqItems(article.content);

  const faqStructuredData = faqItems.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      {faqStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqStructuredData).replace(/</g, "\\u003c"),
          }}
        />
      )}

      <article className="bg-white">
        <header className="border-b border-[#e9e7e2] bg-[#faf9f6]">
          <div className="container-main py-12 sm:py-16 lg:py-20">
            <nav
              aria-label="Breadcrumb"
              className="mb-9 flex flex-wrap items-center gap-2 text-sm text-gray-500"
            >
              <Link href="/" className="transition-colors hover:text-[#b99658]">
                Home
              </Link>

              <span aria-hidden="true">/</span>

              <Link
                href="/articles"
                className="transition-colors hover:text-[#b99658]"
              >
                Articles
              </Link>

              {article.categoryPath.map((category) => (
                <span key={category.id} className="flex items-center gap-2">
                  <span aria-hidden="true">/</span>
                  <Link
                    href={article.categoryUrl}
                    className="transition-colors hover:text-[#b99658]"
                  >
                    {category.name}
                  </Link>
                </span>
              ))}
            </nav>

            <div className="mx-auto max-w-4xl">
              {article.category && (
                <Link
                  href={article.categoryUrl}
                  className="mb-6 inline-flex rounded-full border border-[#e6dfd1] bg-white px-4 py-2 text-xs font-semibold tracking-[0.14em] text-[#9b7842] uppercase transition-colors hover:bg-[#f8f6f1]"
                >
                  {article.category.name}
                </Link>
              )}

              <h1 className="mb-6 font-serif text-4xl leading-[1.12] font-bold tracking-tight text-[#14243d] sm:text-5xl lg:text-6xl">
                {article.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-500">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={16} />
                  <time dateTime={article.published_at}>
                    {formatDate(article.published_at)}
                  </time>
                </span>

                <span className="inline-flex items-center gap-2">
                  <Clock3 size={16} />
                  {formatReadingTime(article.readingTime)}
                </span>
              </div>
              <ArticleShareButton title={article.title} url={canonicalUrl} />
            </div>
          </div>
        </header>

        {article.imageUrl && (
          <div className="container-main pt-10 sm:pt-14">
            <div className="relative mx-auto aspect-[16/9] max-w-5xl overflow-hidden rounded-2xl bg-[#f0eee9]">
              <Image
                src={article.imageUrl}
                alt={article.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 1024px"
                className="object-cover"
              />
            </div>
          </div>
        )}

        <AdPlacement placementKey="article_top" />

        <div className="container-main py-12 sm:py-16">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-[minmax(0,760px)_240px] lg:gap-16">
            <div className="min-w-0">
              <ArticleDocument
                content={article.content}
                title={article.title}
                affiliatePlacements={affiliatePlacements}
              />

              <div className="mt-14 border-t border-[#e9e7e2] pt-8">
                <Link
                  href={article.categoryUrl}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#14243d] transition-colors hover:text-[#b99658]"
                >
                  <ArrowLeft size={16} />
                  More in {article.category?.name || "this topic"}
                </Link>
              </div>
            </div>

            <aside className="h-fit border-t border-[#e9e7e2] pt-8 lg:sticky lg:top-24 lg:border-t-0 lg:pt-0">
              <p className="mb-4 text-xs font-semibold tracking-[0.16em] text-[#b99658] uppercase">
                About TrendPilot
              </p>

              <h2 className="mb-4 font-serif text-2xl font-bold text-[#14243d]">
                Navigate ideas. Discover opportunities.
              </h2>

              <p className="mb-6 text-sm leading-relaxed text-gray-600">
                Explore practical insights, fresh perspectives, and ideas across
                business, technology, finance, education, lifestyle, and
                innovation.
              </p>

              <Link
                href="/articles"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#14243d] transition-colors hover:text-[#b99658]"
              >
                Explore all articles
                <ArrowRight size={16} />
              </Link>
            </aside>
          </div>
        </div>
      </article>

      <AdPlacement placementKey="article_bottom" />

      <PublicCommentThread articleSlug={article.slug} />

      {relatedArticles.length > 0 && (
        <section className="border-t border-[#e9e7e2] bg-[#faf9f6]">
          <div className="container-main py-16 sm:py-20">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-[#b99658] uppercase">
                  Keep exploring
                </p>
                <h2 className="editorial-heading">
                  Related{" "}
                  <span className="text-[#b99658] italic">articles.</span>
                </h2>
              </div>

              <Link
                href={article.categoryUrl}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#14243d] transition-colors hover:text-[#b99658]"
              >
                View topic
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {relatedArticles.map((relatedArticle) => (
                <ArticleCard key={relatedArticle.id} article={relatedArticle} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export default function ArticlePage({ params }) {
  return (
    <Suspense fallback={<ArticleLoading />}>
      <ArticleContent params={params} />
    </Suspense>
  );
}
