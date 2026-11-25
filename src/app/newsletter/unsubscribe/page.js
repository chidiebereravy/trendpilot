import Link from "next/link";
import { Suspense } from "react";
import NewsletterUnsubscribeForm from "@/features/newsletter/components/NewsletterUnsubscribeForm";

export const metadata = {
  title: "Unsubscribe | TrendPilot",
  description:
    "Manage your TrendPilot newsletter email subscription preferences.",
  robots: {
    index: false,
    follow: false,
  },
};

async function UnsubscribeContent({ searchParams }) {
  const query = await searchParams;
  const token = typeof query?.token === "string" ? query.token : "";

  return (
    <div className="mx-auto max-w-xl border border-[#eeeae2] bg-white p-7 shadow-sm sm:p-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center bg-[#f6f1e7] text-[#a78348]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
          <path d="m16 16 2 2 4-4" />
        </svg>
      </div>

      <div className="mt-7 text-center">
        <p className="text-[10px] font-bold tracking-[0.25em] text-[#a78348] uppercase">
          Email preferences
        </p>

        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[#14243d] sm:text-4xl">
          Leaving our newsletter?
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-gray-600">
          We understand that inboxes get busy. If you no longer want to receive
          TrendPilot newsletter emails, you can confirm your choice below.
        </p>
      </div>

      <div className="mt-8">
        <NewsletterUnsubscribeForm token={token} />
      </div>

      <div className="mt-8 border-t border-[#eeeae2] pt-6 text-center">
        <Link
          href="/"
          className="text-xs font-semibold text-[#14243d] transition hover:text-[#a78348]"
        >
          Return to TrendPilot
        </Link>
      </div>
    </div>
  );
}

export default function NewsletterUnsubscribePage({ searchParams }) {
  return (
    <main className="min-h-[65vh] bg-[#fcfbf9] px-4 py-20 sm:py-28">
      <Suspense
        fallback={
          <div className="mx-auto max-w-xl border border-[#eeeae2] bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
            Loading email preferences...
          </div>
        }
      >
        <UnsubscribeContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
