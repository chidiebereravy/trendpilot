import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Lightbulb,
  Search,
  Target,
  TrendingUp,
} from "lucide-react";

const topics = [
  {
    name: "Business",
    description: "Entrepreneurship, marketing, strategy and online business.",
    href: "/category/business",
    icon: TrendingUp,
  },
  {
    name: "Technology",
    description:
      "Artificial intelligence, software and emerging digital trends.",
    href: "/category/technology",
    icon: Lightbulb,
  },
  {
    name: "Finance",
    description: "Personal finance, investing and financial literacy.",
    href: "/category/finance",
    icon: Target,
  },
  {
    name: "Education",
    description: "Learning, careers, skills and professional development.",
    href: "/category/education",
    icon: BookOpen,
  },
  {
    name: "Lifestyle",
    description: "Wellness, productivity and everyday living.",
    href: "/category/lifestyle",
    icon: Compass,
  },
  {
    name: "Innovation",
    description: "New ideas, emerging industries and future opportunities.",
    href: "/category/innovation",
    icon: Search,
  },
];

export const metadata = {
  title: "About Us | TrendPilot",
  description:
    "Discover TrendPilot: a platform for thoughtful insights, practical knowledge and ideas across business, technology, finance, education, lifestyle and innovation.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About TrendPilot",
    description:
      "Navigate ideas. Discover opportunities. Explore knowledge and perspectives that matter.",
    type: "website",
  },
};

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-bold tracking-[0.18em] text-[#a78348] uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-[#14243d] sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-5 text-sm leading-8 text-gray-600 sm:text-base">
          {description}
        </p>
      )}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="font-sans">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#101d30]">
        <div className="hero-pattern absolute inset-0 -z-10 opacity-20" />
        <div className="absolute -top-32 right-[-5%] -z-10 h-96 w-96 rounded-full bg-[#b99658]/15 blur-3xl" />
        <div className="container-main py-20 sm:py-28 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-3 border border-white/20 bg-white/10 px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-[#d5b77e]" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#e6d4b3] uppercase">
                Get to know us
              </span>
            </div>

            <h1 className="mt-8 text-5xl leading-[1.08] font-bold tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Navigate Ideas.
              <span className="mt-3 block text-[#d5b77e]">
                Discover Opportunities.
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-sm leading-8 text-gray-200 sm:text-base">
              TrendPilot is a place to explore useful knowledge, thoughtful
              perspectives and emerging ideas. We bring together subjects that
              matter and help readers discover more within the topics that
              interest them.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/articles"
                className="inline-flex items-center gap-3 rounded-xl bg-[#c7a56c] px-7 py-4 text-xs font-bold text-[#14243d] transition hover:bg-[#e0c895]"
              >
                Explore our articles
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/category/business"
                className="inline-flex items-center gap-3 rounded-xl border border-white/30 px-7 py-4 text-xs font-bold !text-white transition hover:border-[#d5b77e] hover:bg-white/5"
              >
                Discover our topics
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Our story */}
      <section className="bg-white">
        <div className="container-main grid gap-12 py-16 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="Our story"
              title="Curiosity is where discovery begins."
              description="The world is full of information, but finding knowledge that is relevant, understandable and useful can take time. TrendPilot exists to make that exploration more approachable."
            />

            <p className="mt-5 text-sm leading-8 text-gray-600">
              From established industries to emerging ideas, we create space for
              readers to explore different perspectives, understand developing
              trends and learn about subjects they may not have encountered
              before.
            </p>

            <p className="mt-5 text-sm leading-8 text-gray-600">
              Whether you are exploring a familiar subject or discovering
              something entirely new, our goal is to make every visit an
              opportunity to learn.
            </p>
          </div>

          <div className="relative overflow-hidden bg-[#f3f0e9] p-8 sm:p-12">
            <div className="absolute right-[-40px] bottom-[-70px] h-64 w-64 rounded-full border border-[#b99658]/30" />
            <div className="absolute right-[-10px] bottom-[-40px] h-48 w-48 rounded-full border border-[#b99658]/30" />

            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center bg-[#14243d] text-[#d5b77e]">
                <Compass size={26} />
              </div>

              <p className="mt-10 text-xs font-bold tracking-[0.2em] text-[#a78348] uppercase">
                The TrendPilot perspective
              </p>

              <h3 className="mt-4 max-w-md font-serif text-3xl leading-tight font-bold text-[#14243d] sm:text-4xl">
                Better questions lead to more meaningful discoveries.
              </h3>

              <p className="mt-5 max-w-md text-sm leading-7 text-gray-600">
                Explore broadly. Think critically. Follow your curiosity
                wherever it leads.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission and vision */}
      <section className="border-y border-[#eeeae2] bg-[#fcfbf9]">
        <div className="container-main py-16 sm:py-20">
          <SectionHeading
            eyebrow="Our purpose"
            title="Knowledge should open doors."
            description="Our work is guided by a simple idea: useful information can help people understand the world, make informed decisions and recognise new possibilities."
          />

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <article className="border border-[#eeeae2] bg-white p-7 sm:p-9">
              <div className="flex h-12 w-12 items-center justify-center bg-[#f6f1e7] text-[#a78348]">
                <Target size={23} />
              </div>
              <h3 className="mt-6 text-xl font-bold text-[#14243d]">
                Our mission
              </h3>
              <p className="mt-4 text-sm leading-8 text-gray-600">
                To make useful knowledge, practical insights and fresh
                perspectives easier to discover across a wide range of subjects.
              </p>
            </article>

            <article className="border border-[#eeeae2] bg-white p-7 sm:p-9">
              <div className="flex h-12 w-12 items-center justify-center bg-[#f6f1e7] text-[#a78348]">
                <Lightbulb size={23} />
              </div>
              <h3 className="mt-6 text-xl font-bold text-[#14243d]">
                Our vision
              </h3>
              <p className="mt-4 text-sm leading-8 text-gray-600">
                To be a valuable destination for curious readers who want to
                explore ideas, develop their understanding and discover
                opportunities in a changing world.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Topics */}
      <section className="bg-white">
        <div className="container-main py-16 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Explore our coverage"
              title="Six broad subjects. Countless possibilities."
              description="Explore the topics that shape industries, influence everyday decisions and inspire new ways of thinking."
            />

            <Link
              href="/articles"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#14243d] transition hover:text-[#a78348]"
            >
              All articles
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic, index) => {
              const Icon = topic.icon;

              return (
                <Link
                  key={topic.name}
                  href={topic.href}
                  className="group border border-[#eeeae2] bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[#d8c49f] hover:shadow-lg sm:p-7"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center bg-[#f6f1e7] text-[#a78348] transition group-hover:bg-[#14243d] group-hover:text-[#d5b77e]">
                      <Icon size={22} />
                    </div>
                    <span className="text-xs font-semibold tracking-widest text-gray-300">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className="mt-7 text-xl font-bold text-[#14243d]">
                    {topic.name}
                  </h3>

                  <p className="mt-3 min-h-12 text-sm leading-7 text-gray-600">
                    {topic.description}
                  </p>

                  <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#14243d] transition group-hover:text-[#a78348]">
                    Explore topic
                    <ArrowRight size={15} />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Editorial approach */}
      <section className="bg-[#f3f0e9]">
        <div className="container-main grid gap-12 py-16 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="How we approach content"
              title="Useful ideas deserve thoughtful presentation."
              description="We aim to make exploring information a clear and worthwhile experience."
            />
          </div>

          <div className="space-y-7">
            {[
              {
                title: "Clarity",
                description:
                  "Present ideas in a way that readers can understand and explore without unnecessary complexity.",
              },
              {
                title: "Practical value",
                description:
                  "Focus on information, explanations and perspectives that connect with real interests and questions.",
              },
              {
                title: "Curiosity",
                description:
                  "Encourage readers to look beyond familiar subjects and discover specialised topics and emerging ideas.",
              },
              {
                title: "Responsible publishing",
                description:
                  "Value accuracy, context and transparency when presenting information and recommendations.",
              },
            ].map((item, index) => (
              <div
                key={item.title}
                className="flex gap-5 border-b border-[#ddd7ca] pb-7 last:border-0 last:pb-0"
              >
                <span className="pt-1 text-xs font-bold tracking-widest text-[#a78348]">
                  0{index + 1}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-[#14243d]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-gray-600">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-[#101d30]">
        <div className="container-main py-16 text-center sm:py-20">
          <p className="text-xs font-bold tracking-[0.2em] text-[#d5b77e] uppercase">
            Your next discovery starts here
          </p>

          <h2 className="mx-auto mt-5 max-w-2xl text-3xl leading-tight font-bold tracking-tight text-white sm:text-5xl">
            Stay curious. Keep exploring.
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-8 text-gray-300">
            Discover articles, explore specialised topics and find new
            perspectives across the TrendPilot platform.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/articles"
              className="inline-flex items-center gap-3 rounded-xl bg-[#c7a56c] px-7 py-4 text-xs font-bold text-[#14243d] transition hover:bg-[#e0c895]"
            >
              Explore articles
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/"
              className="inline-flex items-center rounded-xl border border-white/30 px-7 py-4 text-xs font-bold !text-white transition hover:border-[#d5b77e] hover:bg-white/5"
            >
              Back to homepage
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
