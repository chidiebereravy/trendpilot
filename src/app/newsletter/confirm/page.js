import Link from "next/link";
import { Suspense } from "react";
import NewsletterConfirmationForm from "@/features/newsletter/components/NewsletterConfirmationForm";

export const metadata = {
  title: "Confirm Your Subscription | TrendPilot",
  description:
    "Confirm your email address to activate your TrendPilot newsletter subscription.",
  robots: {
    index: false,
    follow: false,
  },
};

async function ConfirmationContent({ searchParams }) {
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
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      </div>

      <p className="mt-7 text-center text-xs font-bold tracking-[0.18em] text-[#a78348] uppercase">
        The TrendPilot newsletter
      </p>

      <h1 className="mt-3 text-center text-3xl font-bold tracking-tight text-[#14243d]">
        Confirm your subscription
      </h1>

      <p className="mx-auto mt-4 max-w-md text-center text-sm leading-7 text-gray-600">
        One more step before you join the TrendPilot community. Confirm your
        email address below to activate your newsletter subscription.
      </p>

      <div className="mt-8">
        <NewsletterConfirmationForm token={token} />
      </div>

      <p className="mt-8 text-center text-xs leading-6 text-gray-500">
        If you didn&apos;t request this subscription, you can safely ignore this
        page.
      </p>

      <div className="mt-6 text-center">
        <Link
          href="/"
          className="text-xs font-bold text-[#a78348] transition hover:text-[#14243d]"
        >
          Return to TrendPilot
        </Link>
      </div>
    </div>
  );
}

export default function NewsletterConfirmationPage({ searchParams }) {
  return (
    <main className="min-h-[65vh] bg-[#fcfbf9] px-4 py-20 sm:py-28">
      <Suspense
        fallback={
          <div className="mx-auto max-w-xl border border-[#eeeae2] bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
            Loading confirmation...
          </div>
        }
      >
        <ConfirmationContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
