import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

export default function ArticleNotFound() {
  return (
    <section className="container-main flex min-h-[65vh] items-center justify-center py-20">
      <div className="max-w-xl text-center">
        <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-[#f8f6f1] text-[#b99658]">
          <BookOpen size={28} />
        </div>

        <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-[#b99658] uppercase">
          Article unavailable
        </p>

        <h1 className="mb-5 font-serif text-4xl font-bold tracking-tight text-[#14243d] sm:text-5xl">
          This story could not be found.
        </h1>

        <p className="mb-9 text-base leading-relaxed text-gray-600">
          The article may have been moved, unpublished, or the link may be
          incorrect. Explore our latest insights to discover something useful.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 rounded-sm bg-[#14243d] px-6 py-3 text-sm font-semibold text-[#dfe2e8] transition hover:bg-[#203653]"
          >
            Explore articles
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-sm border border-[#dfe2e8] px-6 py-3 text-sm font-semibold text-[#14243d] transition hover:border-[#b99658]"
          >
            <ArrowLeft size={16} />
            Homepage
          </Link>
        </div>
      </div>
    </section>
  );
}
