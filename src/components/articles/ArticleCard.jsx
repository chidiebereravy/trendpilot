import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { formatDate, formatReadingTime } from "@/lib/utils";

export default function ArticleCard({ article }) {
  return (
    <article className="group overflow-hidden border border-[#eeeae2] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link
        href={`/articles/${article.slug}`}
        aria-label={`Read ${article.title}`}
        className="block"
      >
        <div className="relative h-56 overflow-hidden bg-[#e9e6df]">
          {article.imageUrl ? (
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#314c6c] to-[#14243d]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#101d30]/65 to-transparent" />
          {article.category && (
            <span className="absolute bottom-5 left-5 text-[10px] font-bold tracking-[0.18em] text-white uppercase">
              {article.category.name}
            </span>
          )}
        </div>
      </Link>

      <div className="p-6">
        {article.category && (
          <Link
            href={article.categoryUrl || "/articles"}
            className="text-[10px] font-bold tracking-[0.18em] text-[#a78348] uppercase hover:text-[#14243d]"
          >
            {article.category.name}
          </Link>
        )}

        <h2 className="mt-3 text-xl leading-snug font-bold tracking-tight text-[#14243d] transition group-hover:text-[#a78348]">
          <Link href={`/articles/${article.slug}`}>{article.title}</Link>
        </h2>

        {article.excerptText && (
          <p className="mt-3 line-clamp-3 text-sm leading-7 text-gray-600">
            {article.excerptText}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <span className="flex items-center gap-2 text-xs text-gray-400">
            <Clock3 size={14} />
            {formatReadingTime(article.readingTime)}
          </span>

          <span className="text-xs text-gray-400">
            {formatDate(article.published_at)}
          </span>

          <Link
            href={`/articles/${article.slug}`}
            className="flex items-center gap-1 text-xs font-bold text-[#14243d] hover:text-[#a78348]"
          >
            Read story
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}
