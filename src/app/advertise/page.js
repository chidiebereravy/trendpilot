import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Megaphone,
  Newspaper,
  PanelsTopLeft,
  ShieldCheck,
} from "lucide-react";

export const metadata = {
  title: "Advertise With Us | TrendPilot",
  description:
    "Explore advertising and sponsored content opportunities on TrendPilot. Get in touch to discuss campaign placements and promotional partnerships.",
  alternates: {
    canonical: "/advertise",
  },
  openGraph: {
    title: "Advertise With TrendPilot",
    description:
      "Connect your brand with TrendPilot readers through advertising and sponsored content opportunities.",
    url: "/advertise",
    type: "website",
  },
};

const opportunities = [
  {
    icon: PanelsTopLeft,
    title: "Display Advertising",
    description:
      "Promote your product, service or brand through visual advertisements placed in designated areas of the TrendPilot website.",
  },
  {
    icon: Newspaper,
    title: "Sponsored Content",
    description:
      "Work with TrendPilot on sponsored articles and promotional content that introduces your brand, offering or message to readers.",
  },
  {
    icon: Megaphone,
    title: "Native Advertising",
    description:
      "Reach readers through promotional placements designed to fit naturally within selected content areas while remaining clearly identified as advertising.",
  },
];

const process = [
  {
    number: "01",
    title: "Tell us about your campaign",
    description:
      "Share your brand, campaign objectives, preferred advertising format and any relevant requirements.",
  },
  {
    number: "02",
    title: "Discuss the opportunity",
    description:
      "We'll review your enquiry and discuss suitable placements, creative requirements, availability and campaign details.",
  },
  {
    number: "03",
    title: "Review and approval",
    description:
      "Advertising materials and destinations are subject to review and approval before a campaign can be published.",
  },
  {
    number: "04",
    title: "Campaign publication",
    description:
      "Once approved and scheduled, your campaign can appear in its agreed placement and duration.",
  },
];

export default function AdvertisePage() {
  return (
    <main className="font-sans">
      <header className="relative isolate overflow-hidden bg-[#101d30]">
        <div className="hero-pattern absolute inset-0 -z-10 opacity-20" />
        <div className="absolute -top-32 right-[-5%] -z-10 h-96 w-96 rounded-full bg-[#b99658]/15 blur-3xl" />

        <div className="container-main py-20 sm:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-3 border border-white/20 bg-white/10 px-4 py-3">
              <span className="h-2 w-2 bg-[#d5b77e]" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#e6d4b3] uppercase">
                Advertising opportunities
              </span>
            </div>

            <h1 className="mt-8 text-5xl leading-[1.08] font-bold tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Put your brand
              <span className="mt-3 block text-[#d5b77e]">
                in the spotlight.
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-sm leading-8 text-gray-200 sm:text-base">
              Introduce your brand, products and services to TrendPilot readers
              through display advertising, native placements and sponsored
              content.
            </p>

            <Link
              href="/contact"
              className="mt-9 inline-flex items-center gap-3 bg-[#c7a56c] px-7 py-4 text-xs font-bold text-[#14243d] transition hover:bg-[#e0c895]"
            >
              Discuss advertising
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-white">
        <div className="container-main py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold tracking-[0.18em] text-[#a78348] uppercase">
              Advertising formats
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#14243d] sm:text-4xl">
              Find the right way to reach readers.
            </h2>

            <p className="mt-5 text-sm leading-8 text-gray-600">
              We offer different promotional formats to accommodate campaign
              goals, creative materials and placement requirements.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {opportunities.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="border border-[#eeeae2] bg-[#fcfbf9] p-7 transition hover:-translate-y-1 hover:border-[#d5b77e]"
                >
                  <div className="flex h-12 w-12 items-center justify-center bg-[#f6f1e7] text-[#a78348]">
                    <Icon size={22} />
                  </div>

                  <h3 className="mt-6 text-xl font-bold text-[#14243d]">
                    {item.title}
                  </h3>

                  <p className="mt-4 text-sm leading-8 text-gray-600">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#f8f7f4]">
        <div className="container-main grid gap-12 py-16 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[#a78348] uppercase">
              A clear process
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#14243d] sm:text-4xl">
              From enquiry to campaign publication.
            </h2>

            <p className="mt-5 text-sm leading-8 text-gray-600">
              Every advertising enquiry is an opportunity to understand your
              objectives and determine whether the available placements are
              suitable for your campaign.
            </p>

            <Link
              href="/contact"
              className="mt-8 inline-flex items-center gap-2 text-xs font-bold text-[#14243d] transition hover:text-[#a78348]"
            >
              Send an advertising enquiry
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="space-y-7">
            {process.map((item) => (
              <div key={item.number} className="flex gap-5">
                <span className="shrink-0 font-serif text-2xl font-bold text-[#b99658]">
                  {item.number}
                </span>

                <div>
                  <h3 className="font-bold text-[#14243d]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-gray-600">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="container-main grid gap-8 py-16 sm:py-20 md:grid-cols-2">
          <div className="border border-[#eeeae2] p-7 sm:p-9">
            <ShieldCheck size={27} className="text-[#a78348]" />

            <h2 className="mt-5 text-xl font-bold text-[#14243d]">
              Responsible advertising
            </h2>

            <p className="mt-4 text-sm leading-8 text-gray-600">
              Advertisements and sponsored materials must meet our platform
              requirements and applicable advertising standards. Promotional
              content is identified so readers can distinguish it from
              independent editorial material.
            </p>
          </div>

          <div className="border border-[#eeeae2] p-7 sm:p-9">
            <BarChart3 size={27} className="text-[#a78348]" />

            <h2 className="mt-5 text-xl font-bold text-[#14243d]">
              Campaign performance
            </h2>

            <p className="mt-4 text-sm leading-8 text-gray-600">
              Campaign activity may be measured through available performance
              metrics, including impressions and clicks. Reporting depends on
              the campaign format and available measurement data. We do not
              guarantee particular results.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#101d30]">
        <div className="container-main py-16 text-center sm:py-20">
          <p className="text-xs font-bold tracking-[0.2em] text-[#d5b77e] uppercase">
            Let&apos;s work together
          </p>

          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Have a campaign in mind?
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-8 text-gray-300">
            Tell us about your brand and advertising goals. Get in touch to
            discuss available opportunities on TrendPilot.
          </p>

          <Link
            href="/contact"
            className="mt-8 inline-flex items-center gap-3 bg-[#c7a56c] px-7 py-4 text-xs font-bold text-[#14243d] transition hover:bg-[#e0c895]"
          >
            Contact TrendPilot
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
