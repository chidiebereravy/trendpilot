import ArticleCard from "@/components/articles/ArticleCard";
import {
  getPublishedArticles,
  getPublishedCategories,
} from "@/lib/public-content";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Lightbulb,
  Search,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const NICHE_PRESENTATION = {
  business: {
    description: "Entrepreneurship, marketing and online business.",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=85",
  },
  technology: {
    description: "Artificial intelligence, software and digital trends.",
    image:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=900&q=85",
  },
  finance: {
    description: "Personal finance, investing and financial literacy.",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=85",
  },
  education: {
    description: "Learning, careers and professional development.",
    image:
      "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=900&q=85",
  },
  lifestyle: {
    description: "Wellness, productivity and everyday living.",
    image:
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=85",
  },
  innovation: {
    description: "New ideas, emerging industries and opportunities.",
    image:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=900&q=85",
  },
};

const heroImages = [
  {
    label: "Business",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=90",
    position: "left-[2%] top-[3%] z-10 w-[53%] rotate-[-7deg]",
  },
  {
    label: "Technology",
    image:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=900&q=90",
    position: "right-[1%] top-[9%] z-20 w-[48%] rotate-[6deg]",
  },
  {
    label: "Finance",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=90",
    position: "left-[4%] bottom-[5%] z-30 w-[49%] rotate-[5deg]",
  },
  {
    label: "Ideas & People",
    image:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=90",
    position: "right-[0%] bottom-[1%] z-40 w-[52%] rotate-[-5deg]",
  },
];

function HeroCollage() {
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-[550px] sm:h-[490px] lg:h-[550px]">
      <div className="absolute inset-[10%] rotate-[-8deg] rounded-full bg-[#c7a56c]/25 blur-3xl" />

      {heroImages.map((item, index) => (
        <div
          key={item.label}
          className={`absolute ${item.position} h-[190px] overflow-hidden rounded-xl border-[5px] border-white shadow-2xl sm:h-[225px] lg:h-[260px]`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center transition duration-700 hover:scale-110"
            style={{ backgroundImage: `url("${item.image}")` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101d30]/75 to-transparent" />
          <span className="absolute bottom-4 left-4 text-[10px] font-bold tracking-[0.2em] text-white uppercase">
            {item.label}
          </span>
        </div>
      ))}

      <div className="absolute right-0 bottom-[9%] z-50 border border-[#e8e0d1] bg-white px-4 py-4 shadow-2xl sm:right-[-2%] sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f6f1e7]">
            <BookOpen size={19} className="text-[#b99658]" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#14243d]">
              Ideas worth exploring
            </p>
            <p className="mt-1 text-[10px] text-gray-500">
              Knowledge. Perspective. Progress.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="max-w-2xl">
      <span className="text-[10px] font-bold tracking-[0.2em] text-[#a78348] uppercase">
        {eyebrow}
      </span>
      <h2 className="mt-3 text-3xl leading-tight font-bold tracking-tight text-[#14243d] sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-sm leading-7 text-gray-600">{description}</p>
      )}
    </div>
  );
}

function NicheCard({ niche, index }) {
  return (
    <article className="group overflow-hidden border border-[#eeeae2] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link
        href={`/category/${niche.slug}`}
        className="block"
        aria-label={`Explore ${niche.name} niche`}
      >
        <div className="relative h-48 overflow-hidden bg-[#e9e6df]">
          <div
            className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-110"
            style={{ backgroundImage: `url("${niche.image}")` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101d30]/80 via-transparent to-transparent" />

          <span className="absolute top-4 left-4 border border-white/40 bg-[#101d30]/50 px-3 py-2 text-[9px] font-bold tracking-[0.18em] text-white uppercase backdrop-blur-sm">
            Broad niche {String(index + 1).padStart(2, "0")}
          </span>

          <h3 className="absolute bottom-5 left-5 text-2xl font-bold text-white">
            {niche.name}
          </h3>
        </div>
      </Link>

      <div className="p-5">
        <p className="text-sm leading-6 text-gray-600">{niche.description}</p>

        <Link
          href={`/category/${niche.slug}`}
          className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#14243d] transition hover:text-[#a78348]"
        >
          Explore this niche
          <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  );
}

async function NicheGrid() {
  const categories = await getPublishedCategories();

  const niches = categories
    .filter((category) => category.level === "broad")
    .sort((a, b) => a.display_order - b.display_order)
    .map((category) => {
      const presentation = NICHE_PRESENTATION[category.slug];

      if (!presentation) return null;

      return {
        ...category,
        ...presentation,
      };
    })
    .filter(Boolean);

  if (niches.length === 0) {
    return (
      <div className="border border-[#eeeae2] bg-white px-6 py-12 text-center sm:col-span-2 lg:col-span-3">
        <h3 className="font-semibold text-[#14243d]">
          Topics are being prepared.
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Check back soon to explore our growing collection of niches.
        </p>
      </div>
    );
  }

  return (
    <>
      {niches.map((niche, index) => (
        <NicheCard key={niche.id} niche={niche} index={index} />
      ))}
    </>
  );
}

async function StoriesGrid() {
  const articles = await getPublishedArticles({ limit: 6 });

  if (articles.length === 0) {
    return (
      <div className="border border-[#eeeae2] bg-[#fcfbf9] px-6 py-14 text-center md:col-span-2 lg:col-span-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center bg-[#f3f0e9]">
          <BookOpen size={24} className="text-[#b99658]" />
        </div>

        <h3 className="mt-5 text-xl font-bold text-[#14243d]">
          Our first stories are on the way.
        </h3>

        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-gray-600">
          The TrendPilot editorial team is preparing thoughtful insights and
          practical knowledge. Published articles will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </>
  );
}

function NicheGridFallback() {
  return Array.from({ length: 6 }, (_, index) => (
    <div
      key={index}
      className="animate-pulse overflow-hidden border border-[#eeeae2] bg-white"
    >
      <div className="h-48 bg-gray-200" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-2/3 rounded bg-gray-100" />
      </div>
    </div>
  ));
}

function StoriesGridFallback() {
  return Array.from({ length: 3 }, (_, index) => (
    <div
      key={index}
      className="animate-pulse overflow-hidden border border-[#eeeae2] bg-white"
    >
      <div className="h-56 bg-gray-200" />
      <div className="space-y-4 p-6">
        <div className="h-3 w-1/4 rounded bg-gray-200" />
        <div className="h-5 w-4/5 rounded bg-gray-200" />
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-2/3 rounded bg-gray-100" />
      </div>
    </div>
  ));
}

export default function HomePage() {
  return (
    <main className="font-sans">
      <section className="relative isolate overflow-hidden bg-[#101d30]">
        <div
          className="absolute inset-0 -z-30 bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/trendpilot-hero.png')",
          }}
        />
        <div className="absolute inset-0 -z-20 bg-[#101d30]/75" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#101d30] via-[#101d30]/90 to-[#101d30]/55" />
        <div className="hero-pattern absolute inset-0 -z-10 opacity-20" />

        <div className="container-main grid items-center gap-8 py-12 sm:py-16 lg:min-h-[720px] lg:grid-cols-[1.05fr_0.95fr] lg:gap-4 lg:py-20">
          <div className="relative z-50 max-w-2xl py-5">
            <div className="inline-flex items-center gap-3 border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#d5b77e]" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#e6d4b3] uppercase">
                Independent ideas. Meaningful insights.
              </span>
            </div>

            <h1 className="mt-8 text-5xl leading-[1.08] font-bold tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Explore Ideas.
              <span className="mt-2 block text-[#d5b77e]">
                Find Your Opportunity.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-sm leading-8 text-gray-200 sm:text-base">
              Discover useful knowledge, carefully selected insights and focused
              topics across business, technology, finance, education, lifestyle
              and innovation. Follow your interests from broad subjects to
              highly specific micro niches.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/articles"
                className="inline-flex items-center gap-3 bg-[#c7a56c] px-7 py-4 text-xs font-bold text-[#14243d] transition hover:bg-[#e0c895]"
              >
                Discover stories
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/category/business"
                className="inline-flex items-center gap-3 border border-white/40 bg-white/5 px-7 py-4 text-xs font-bold text-white transition hover:border-[#d5b77e] hover:bg-white/10"
              >
                Explore niches
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/20 pt-7">
              <div className="flex items-center gap-3">
                <TrendingUp size={19} className="text-[#d5b77e]" />
                <span className="text-xs font-medium text-gray-200">
                  Discover emerging trends
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Lightbulb size={19} className="text-[#d5b77e]" />
                <span className="text-xs font-medium text-gray-200">
                  Explore focused knowledge
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10">
            <HeroCollage />
          </div>
        </div>
      </section>

      <section className="border-b border-[#eeeae2] bg-[#fcfbf9]">
        <div className="container-main py-14 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <SectionHeading
              eyebrow="Explore your interests"
              title="Six broad niches. Countless ideas."
              description="Start with a subject you love. Discover its subcategories and explore focused micro niches curated by the TrendPilot editorial team."
            />
            <Link
              href="/articles"
              className="mb-1 inline-flex items-center gap-2 text-xs font-bold text-[#14243d] hover:text-[#a78348]"
            >
              Browse all stories
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Suspense fallback={<NicheGridFallback />}>
              <NicheGrid />
            </Suspense>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="container-main">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <SectionHeading
              eyebrow="The TrendPilot journal"
              title="Stories that make you think."
              description="Thoughtful perspectives and useful information across subjects that matter."
            />
            <Link
              href="/articles"
              className="mb-1 inline-flex items-center gap-2 text-xs font-bold text-[#14243d] hover:text-[#a78348]"
            >
              View all articles
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            <Suspense fallback={<StoriesGridFallback />}>
              <StoriesGrid />
            </Suspense>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-[#f3f0e9]">
        <div
          className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 bg-cover bg-center opacity-20 md:block"
          style={{
            backgroundImage: "url('/images/trendpilot-hero.png')",
          }}
        />
        <div className="container-main grid gap-10 py-16 sm:py-20 md:grid-cols-2 md:items-center">
          <div>
            <SectionHeading
              eyebrow="Go beyond the obvious"
              title="Find the smaller opportunities inside bigger ideas."
              description="A broad subject can contain hundreds of specialised topics. TrendPilot is designed to help readers discover focused areas of knowledge, explore emerging interests and find valuable perspectives."
            />
            <Link
              href="/articles"
              className="mt-7 inline-flex items-center gap-3 bg-[#14243d] px-6 py-4 text-xs font-bold text-white transition hover:bg-[#263e59]"
            >
              Start exploring
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="relative min-h-[320px] overflow-hidden bg-[#14243d] shadow-xl">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-45"
              style={{
                backgroundImage: "url('/images/trendpilot-hero.png')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#101d30]/95 via-[#14243d]/65 to-transparent" />
            <div className="relative flex min-h-[320px] flex-col justify-end p-8 sm:p-10">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#d5b77e] uppercase">
                Broad niches to micro niches
              </span>
              <h3 className="mt-4 max-w-sm text-3xl leading-tight font-bold tracking-tight text-white sm:text-4xl">
                The more focused the question, the more interesting the
                discovery.
              </h3>
            </div>
          </div>
        </div>
      </section>

      <section className="newsletter-section mt-14">
        <div className="container-main grid gap-10 py-16 sm:py-20 md:grid-cols-2 md:items-center">
          <div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#a78348] uppercase">
              Stay informed
            </span>
            <h2 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-[#14243d] sm:text-4xl">
              Make room for better ideas.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-8 text-gray-600">
              Get fresh perspectives, useful stories and thoughtful insights.
              Join the TrendPilot community and discover something worth
              sharing.
            </p>
          </div>

          <div className="border border-[#e7e3da] bg-white p-7 shadow-sm sm:p-9">
            <div className="flex h-12 w-12 items-center justify-center bg-[#f6f1e7]">
              <Search size={21} className="text-[#b99658]" />
            </div>
            <h3 className="mt-5 text-2xl font-bold tracking-tight text-[#14243d]">
              The TrendPilot newsletter
            </h3>
            <p className="mt-2 text-sm leading-7 text-gray-600">
              Thoughtful reading, delivered to your inbox.
            </p>
            <Link
              href="/newsletter"
              className="mt-6 inline-flex w-full items-center justify-center gap-3 bg-[#14243d] px-6 py-4 text-xs font-bold text-white transition hover:bg-[#263e59]"
            >
              Join our newsletter
              <ArrowRight size={16} />
            </Link>
            <p className="mt-4 text-center text-[11px] text-gray-400">
              You can unsubscribe at any time.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
