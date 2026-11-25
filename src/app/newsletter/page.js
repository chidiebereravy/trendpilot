import Link from "next/link";
import { ArrowRight, BookOpen, Mail, ShieldCheck } from "lucide-react";
import NewsletterSignupForm from "@/features/newsletter/components/NewsletterSignupForm";
import Image from "next/image";

export const metadata = {
  title: "Newsletter | TrendPilot",
  description:
    "Get fresh perspectives, useful stories and thoughtful insights delivered to your inbox with the TrendPilot newsletter.",
  alternates: {
    canonical: "/newsletter",
  },
  openGraph: {
    title: "The TrendPilot Newsletter",
    description:
      "Discover useful stories, fresh perspectives and thoughtful insights from TrendPilot.",
    type: "website",
  },
};

export default function NewsletterPage() {
  return (
    <div className="font-sans">
      <section className="relative isolate overflow-hidden bg-[#101d30]">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/newsletter-hero.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />

          <div className="absolute inset-0 bg-[#101d30]/70" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#101d30]/95 via-[#101d30]/75 to-[#101d30]/35" />
        </div>

        <div className="container-main py-24 sm:py-32 lg:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-3 border border-white/20 bg-white/10 px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-[#d5b77e]" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#e6d4b3] uppercase">
                The TrendPilot newsletter
              </span>
            </div>

            <h1 className="mt-8 text-5xl leading-[1.08] font-bold tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Make room for
              <span className="mt-3 block text-[#d5b77e]">better ideas.</span>
            </h1>

            <p className="mt-8 max-w-2xl text-sm leading-8 text-gray-200 sm:text-base">
              Get fresh perspectives, useful stories and thoughtful insights.
              Join the TrendPilot community and discover something worth
              sharing.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="container-main grid gap-12 py-16 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <aside>
            <p className="text-xs font-bold tracking-[0.18em] text-[#a78348] uppercase">
              Stay curious
            </p>

            <h2 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-[#14243d] sm:text-4xl">
              Good ideas deserve a place in your inbox.
            </h2>

            <p className="mt-5 text-sm leading-8 text-gray-600">
              The TrendPilot newsletter brings together useful content and
              perspectives to help you stay informed, explore new ideas and make
              the most of what you read.
            </p>

            <div className="mt-9 space-y-6">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#f6f1e7] text-[#a78348]">
                  <BookOpen size={21} />
                </div>
                <div>
                  <h3 className="font-bold text-[#14243d]">
                    Useful perspectives
                  </h3>
                  <p className="mt-1 text-sm leading-7 text-gray-600">
                    Discover stories and insights worth your attention.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#f6f1e7] text-[#a78348]">
                  <Mail size={21} />
                </div>
                <div>
                  <h3 className="font-bold text-[#14243d]">
                    Delivered by email
                  </h3>
                  <p className="mt-1 text-sm leading-7 text-gray-600">
                    Receive newsletter updates directly in your inbox.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#f6f1e7] text-[#a78348]">
                  <ShieldCheck size={21} />
                </div>
                <div>
                  <h3 className="font-bold text-[#14243d]">
                    Your choice matters
                  </h3>
                  <p className="mt-1 text-sm leading-7 text-gray-600">
                    Confirm your email before subscribing and unsubscribe
                    whenever you choose.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 border-l-2 border-[#b99658] bg-[#fcfbf9] p-5">
              <p className="text-sm leading-7 text-gray-600">
                Prefer to explore before subscribing?
              </p>
              <Link
                href="/articles"
                className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#14243d] transition hover:text-[#a78348]"
              >
                Browse our articles
                <ArrowRight size={15} />
              </Link>
            </div>
          </aside>

          <div className="border border-[#eeeae2] bg-[#fcfbf9] p-6 sm:p-9 lg:p-10">
            <p className="text-xs font-bold tracking-[0.18em] text-[#a78348] uppercase">
              Join the community
            </p>

            <h2 className="mt-3 text-2xl font-bold text-[#14243d] sm:text-3xl">
              Subscribe to TrendPilot.
            </h2>

            <p className="mt-3 mb-8 text-sm leading-7 text-gray-600">
              Enter your details below to get started. We&apos;ll send you an
              email to confirm your subscription.
            </p>

            <NewsletterSignupForm />
          </div>
        </div>
      </section>

      <section className="bg-[#101d30]">
        <div className="container-main py-14 text-center sm:py-16">
          <p className="text-xs font-bold tracking-[0.2em] text-[#d5b77e] uppercase">
            Keep exploring
          </p>

          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            There&apos;s more to discover.
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-8 text-gray-300">
            Explore practical knowledge, thoughtful stories and fresh
            perspectives across TrendPilot.
          </p>

          <Link
            href="/articles"
            className="mt-8 inline-flex items-center gap-3 bg-[#c7a56c] px-7 py-4 text-xs font-bold text-[#14243d] transition hover:bg-[#e0c895]"
          >
            Explore articles
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
