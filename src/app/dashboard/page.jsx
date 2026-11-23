import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  FolderTree,
  Image as ImageIcon,
  Layers3,
  Plus,
  Send,
  Settings2,
  Users,
} from "lucide-react";

import { requireRole } from "@/lib/auth/session";

export const metadata = {
  title: "Dashboard Overview | TrendPilot",
  description: "Editorial performance and publishing workspace overview.",
};

const ARTICLE_STATUSES = [
  { key: "published", label: "Published", color: "bg-emerald-500" },
  { key: "draft", label: "Drafts", color: "bg-slate-400" },
  { key: "in_review", label: "In review", color: "bg-amber-500" },
  { key: "scheduled", label: "Scheduled", color: "bg-blue-500" },
  { key: "archived", label: "Archived", color: "bg-slate-300" },
];

const MONTH_FORMAT = new Intl.DateTimeFormat("en", {
  month: "short",
  timeZone: "UTC",
});

const DATE_FORMAT = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function getMonthStarts() {
  const now = new Date();
  const currentMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      currentMonth - (5 - index) * 30 * 24 * 60 * 60 * 1000,
    );

    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  });
}

function getSixMonthWindow() {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1),
  );

  return {
    start,
    end: now,
  };
}

function getMonthBuckets() {
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1),
    );

    return {
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
        2,
        "0",
      )}`,
      label: MONTH_FORMAT.format(date),
      count: 0,
    };
  });
}

async function getExactCount(query) {
  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function getPublishedArticles(supabase, startDate) {
  const pageSize = 1000;
  const rows = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("articles")
      .select("published_at")
      .eq("status", "published")
      .not("published_at", "is", null)
      .gte("published_at", startDate.toISOString())
      .order("published_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw error;
    }

    const batch = data ?? [];
    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
}

async function getDashboardOverview(supabase, role) {
  const isAdmin = role === "admin";
  const isEditor = role === "editor";

  const { start } = getSixMonthWindow();

  const articleCountQueries = [
    getExactCount(
      supabase.from("articles").select("id", {
        count: "exact",
        head: true,
      }),
    ),
    ...ARTICLE_STATUSES.map(({ key }) =>
      getExactCount(
        supabase
          .from("articles")
          .select("id", { count: "exact", head: true })
          .eq("status", key),
      ),
    ),
  ];

  const categoryCountQueries = [
    getExactCount(
      supabase.from("categories").select("id", {
        count: "exact",
        head: true,
      }),
    ),
    getExactCount(
      supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("level", "broad"),
    ),
    getExactCount(
      supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("level", "subcategory"),
    ),
    getExactCount(
      supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("level", "micro"),
    ),
  ];

  const mediaCountQueries = [
    getExactCount(
      supabase.from("media_assets").select("id", {
        count: "exact",
        head: true,
      }),
    ),
    getExactCount(
      supabase
        .from("media_assets")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
    ),
    getExactCount(
      supabase
        .from("media_assets")
        .select("id", { count: "exact", head: true })
        .eq("status", "staged"),
    ),
  ];

  const [
    articleCounts,
    categoryCounts,
    mediaCounts,
    recentResult,
    publishedRows,
    categoryResult,
  ] = await Promise.all([
    Promise.all(articleCountQueries),
    Promise.all(categoryCountQueries),
    Promise.all(mediaCountQueries),
    supabase
      .from("articles")
      .select("id, title, slug, status, updated_at, published_at, category_id")
      .order("updated_at", { ascending: false })
      .limit(6),
    getPublishedArticles(supabase, start),
    supabase
      .from("categories")
      .select("id, parent_id, name, level, status")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })
      .limit(1000),
  ]);

  if (recentResult.error) {
    throw recentResult.error;
  }

  if (categoryResult.error) {
    throw categoryResult.error;
  }

  const [
    totalArticles,
    publishedArticles,
    draftArticles,
    inReviewArticles,
    scheduledArticles,
    archivedArticles,
  ] = articleCounts;

  const [totalCategories, broadNiches, subcategories, microNiches] =
    categoryCounts;

  const [totalMedia, publishedMedia, stagedMedia] = mediaCounts;

  const categories = categoryResult.data ?? [];
  const categoryMap = new Map(
    categories.map((category) => [category.id, category]),
  );

  const monthBuckets = getMonthBuckets();
  const bucketMap = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]));

  for (const article of publishedRows) {
    if (!article.published_at) continue;

    const date = new Date(article.published_at);
    const key = `${date.getUTCFullYear()}-${String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0")}`;

    const bucket = bucketMap.get(key);

    if (bucket) {
      bucket.count += 1;
    }
  }

  const maximumMonthlyCount = Math.max(
    1,
    ...monthBuckets.map((bucket) => bucket.count),
  );

  const recentArticles = (recentResult.data ?? []).map((article) => {
    const category = categoryMap.get(article.category_id);

    return {
      ...article,
      categoryName: category?.name ?? "Category unavailable",
    };
  });

  const workflowTotal =
    publishedArticles +
    draftArticles +
    inReviewArticles +
    scheduledArticles +
    archivedArticles;

  return {
    role,
    isAdmin,
    isEditor,
    articles: {
      total: totalArticles,
      published: publishedArticles,
      draft: draftArticles,
      inReview: inReviewArticles,
      scheduled: scheduledArticles,
      archived: archivedArticles,
    },
    categories: {
      total: totalCategories,
      broad: broadNiches,
      subcategories,
      micro: microNiches,
    },
    media: {
      total: totalMedia,
      published: publishedMedia,
      staged: stagedMedia,
    },
    workflowTotal,
    chart: {
      months: monthBuckets,
      maximum: maximumMonthlyCount,
      total: publishedRows.length,
    },
    recentArticles,
  };
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-bold tracking-[0.16em] text-amber-700 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  href,
  accent = "navy",
}) {
  const accents = {
    navy: "bg-slate-100 text-slate-700",
    gold: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {value.toLocaleString("en")}
          </p>
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${accents[accent]}`}
        >
          <Icon size={19} strokeWidth={1.8} />
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900">
          View section
        </span>
        <ArrowRight
          size={15}
          className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-amber-700"
        />
      </div>
    </Link>
  );
}

function PublishingChart({ chart }) {
  const { months, maximum, total } = chart;

  const chartWidth = 640;
  const chartHeight = 210;
  const left = 12;
  const right = 12;
  const top = 18;
  const bottom = 28;
  const usableWidth = chartWidth - left - right;
  const usableHeight = chartHeight - top - bottom;

  const points = months.map((month, index) => {
    const x = left + (index / Math.max(1, months.length - 1)) * usableWidth;
    const y = top + usableHeight - (month.count / maximum) * usableHeight;

    return { x, y, ...month };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - bottom} L ${points[0].x} ${chartHeight - bottom} Z`;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <BarChart3 size={18} />
            </span>
            <p className="text-sm font-semibold text-slate-800">
              Publishing performance
            </p>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-950">
              {total.toLocaleString("en")}
            </span>
            <span className="text-sm text-slate-500">articles published</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Monthly publishing activity over the last six months
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Live database data
        </span>
      </div>

      <div className="mt-7">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label="Monthly number of published articles over the last six months"
        >
          {[0, 1, 2, 3].map((line) => {
            const y = top + (usableHeight / 3) * line;

            return (
              <line
                key={line}
                x1={left}
                x2={chartWidth - right}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 5"
                strokeWidth="1"
              />
            );
          })}

          {total > 0 ? (
            <>
              <path d={areaPath} fill="#d9a441" opacity="0.13" />
              <path
                d={linePath}
                fill="none"
                stroke="#b7791f"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((point) => (
                <circle
                  key={point.key}
                  cx={point.x}
                  cy={point.y}
                  r="4.5"
                  fill="#ffffff"
                  stroke="#b7791f"
                  strokeWidth="2.5"
                />
              ))}
            </>
          ) : (
            <text
              x={chartWidth / 2}
              y={chartHeight / 2}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="13"
            >
              No published articles in this period
            </text>
          )}

          {points.map((point) => (
            <text
              key={point.key}
              x={point.x}
              y={chartHeight - 7}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="11"
            >
              {point.label}
            </text>
          ))}
        </svg>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-6">
        {months.map((month) => (
          <div key={month.key}>
            <p className="text-[11px] text-slate-400">{month.label}</p>
            <p className="mt-1 text-sm font-bold text-slate-800 tabular-nums">
              {month.count}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkflowOverview({ articles }) {
  const items = [
    {
      label: "Published",
      count: articles.published,
      color: "bg-emerald-500",
    },
    {
      label: "Drafts",
      count: articles.draft,
      color: "bg-slate-400",
    },
    {
      label: "In review",
      count: articles.inReview,
      color: "bg-amber-500",
    },
    {
      label: "Scheduled",
      count: articles.scheduled,
      color: "bg-blue-500",
    },
    {
      label: "Archived",
      count: articles.archived,
      color: "bg-slate-300",
    },
  ];

  const total = articles.total;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <SectionHeading
        eyebrow="Editorial workflow"
        title="Article status"
        description="A breakdown of your content pipeline."
        action={
          <Link
            href="/dashboard/articles"
            className="text-xs font-semibold text-amber-700 hover:text-amber-800"
          >
            Manage articles
          </Link>
        }
      />

      <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-100">
        {items.map((item) => (
          <div
            key={item.label}
            className={`${item.color} transition-all`}
            style={{
              width: total > 0 ? `${(item.count / total) * 100}%` : "0%",
            }}
            title={`${item.label}: ${item.count}`}
          />
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <span className={`size-2.5 rounded-full ${item.color}`} />
              <span className="text-sm text-slate-600">{item.label}</span>
            </div>
            <span className="text-sm font-semibold text-slate-900 tabular-nums">
              {item.count.toLocaleString("en")}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoryOverview({ categories, isAdmin }) {
  const levels = [
    {
      label: "Broad Niches",
      count: categories.broad,
      icon: Layers3,
    },
    {
      label: "Subcategories",
      count: categories.subcategories,
      icon: FolderTree,
    },
    {
      label: "Micro Niches",
      count: categories.micro,
      icon: FileText,
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <SectionHeading
        eyebrow="Content structure"
        title="Category hierarchy"
        description="Your publishing taxonomy at a glance."
        action={
          isAdmin ? (
            <Link
              href="/dashboard/categories"
              className="text-xs font-semibold text-amber-700 hover:text-amber-800"
            >
              Manage categories
            </Link>
          ) : null
        }
      />

      <div className="mt-6">
        <p className="text-3xl font-bold tracking-tight text-slate-950">
          {categories.total.toLocaleString("en")}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Total accessible categories
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {levels.map(({ label, count, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
                <Icon size={17} />
              </span>
              <span className="text-sm font-medium text-slate-700">
                {label}
              </span>
            </div>
            <span className="text-sm font-bold text-slate-900 tabular-nums">
              {count.toLocaleString("en")}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MediaOverview({ media }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <SectionHeading
        eyebrow="Creative assets"
        title="Media library"
        description="Manage images used across your content."
        action={
          <Link
            href="/dashboard/media"
            className="text-xs font-semibold text-amber-700 hover:text-amber-800"
          >
            Open library
          </Link>
        }
      />

      <div className="mt-6 flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <ImageIcon size={25} strokeWidth={1.7} />
        </span>
        <div>
          <p className="text-3xl font-bold tracking-tight text-slate-950">
            {media.total.toLocaleString("en")}
          </p>
          <p className="mt-1 text-xs text-slate-500">Total media assets</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-100 p-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={15} />
            <span className="text-xs font-medium">Published</span>
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900 tabular-nums">
            {media.published.toLocaleString("en")}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 p-3">
          <div className="flex items-center gap-2 text-amber-700">
            <Clock3 size={15} />
            <span className="text-xs font-medium">Awaiting review</span>
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900 tabular-nums">
            {media.staged.toLocaleString("en")}
          </p>
        </div>
      </div>
    </section>
  );
}

function RecentArticles({ articles }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <SectionHeading
        eyebrow="Latest activity"
        title="Recently updated articles"
        description="The latest changes across your editorial workspace."
        action={
          <Link
            href="/dashboard/articles"
            className="text-xs font-semibold text-amber-700 hover:text-amber-800"
          >
            All articles
          </Link>
        }
      />

      {articles.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center">
          <BookOpen className="mx-auto text-slate-300" size={28} />
          <p className="mt-3 text-sm font-semibold text-slate-700">
            No articles yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Your recent article activity will appear here.
          </p>
          <Link
            href="/dashboard/articles"
            className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-amber-700 hover:text-amber-800"
          >
            Open article management
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                <th className="pr-4 pb-3">Article</th>
                <th className="pr-4 pb-3">Category</th>
                <th className="pr-4 pb-3">Status</th>
                <th className="pb-3 text-right">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr
                  key={article.id}
                  className="border-b border-slate-50 last:border-0"
                >
                  <td className="py-4 pr-4">
                    <p className="max-w-[280px] truncate text-sm font-semibold text-slate-800">
                      {article.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      /{article.slug}
                    </p>
                  </td>
                  <td className="py-4 pr-4 text-xs text-slate-500">
                    {article.categoryName}
                  </td>
                  <td className="py-4 pr-4">
                    <ArticleStatus status={article.status} />
                  </td>
                  <td className="py-4 text-right text-xs text-slate-500 tabular-nums">
                    {article.updated_at
                      ? DATE_FORMAT.format(new Date(article.updated_at))
                      : "â€”"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ArticleStatus({ status }) {
  const styles = {
    published: "bg-emerald-50 text-emerald-700",
    draft: "bg-slate-100 text-slate-600",
    in_review: "bg-amber-50 text-amber-700",
    scheduled: "bg-blue-50 text-blue-700",
    archived: "bg-slate-100 text-slate-500",
  };

  const labels = {
    published: "Published",
    draft: "Draft",
    in_review: "In review",
    scheduled: "Scheduled",
    archived: "Archived",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        styles[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function QuickLink({ href, icon: Icon, title, description }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-amber-300 hover:shadow-md hover:shadow-slate-200/40"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-amber-50 group-hover:text-amber-700">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-800">
          {title}
        </span>
        <span className="mt-1 block text-xs text-slate-500">{description}</span>
      </span>
      <ArrowRight
        size={15}
        className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-amber-700"
      />
    </Link>
  );
}

async function DashboardPageContent() {
  await connection();

  const { supabase, profile } = await requireRole([
    "author",
    "editor",
    "admin",
  ]);

  const overview = await getDashboardOverview(supabase, profile.role);

  const isAdmin = profile.role === "admin";
  const isEditor = profile.role === "editor";

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-amber-700 uppercase">
            <span className="size-1.5 rounded-full bg-amber-500" />
            TrendPilot workspace
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Good to see you, {profile.display_name || "there"}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Your editorial operations at a glance. Track publishing activity,
            manage your content structure, and move quickly between workspace
            sections.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/articles"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus size={16} />
            Create article
          </Link>
          {isAdmin ? (
            <Link
              href="/dashboard/categories"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50/50"
            >
              <FolderTree size={16} />
              Categories
            </Link>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Workspace performance"
          title="Your content at a glance"
          description="Live totals based on the records available to your account."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total articles"
            value={overview.articles.total}
            description="Across all editorial statuses"
            icon={FileText}
            href="/dashboard/articles"
          />
          <MetricCard
            label="Published articles"
            value={overview.articles.published}
            description="Live content in your publication"
            icon={CheckCircle2}
            href="/dashboard/articles"
            accent="green"
          />
          <MetricCard
            label="Total categories"
            value={overview.categories.total}
            description="Broad niches to micro niches"
            icon={FolderTree}
            href={isAdmin ? "/dashboard/categories" : "/dashboard/articles"}
            accent="gold"
          />
          <MetricCard
            label="Media assets"
            value={overview.media.total}
            description="Images in your media library"
            icon={ImageIcon}
            href="/dashboard/media"
            accent="blue"
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
        <PublishingChart chart={overview.chart} />
        <WorkflowOverview articles={overview.articles} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <CategoryOverview categories={overview.categories} isAdmin={isAdmin} />
        <MediaOverview media={overview.media} />
      </section>

      <RecentArticles articles={overview.recentArticles} />

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Workspace navigation"
          title="Quick access"
          description="Jump directly to the tools you use to run your publication."
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <QuickLink
            href="/dashboard/articles"
            icon={FileText}
            title="Article management"
            description="Create, edit, review and publish articles."
          />
          <QuickLink
            href="/dashboard/media"
            icon={ImageIcon}
            title="Media library"
            description="Upload and manage editorial images."
          />
          {isAdmin ? (
            <QuickLink
              href="/dashboard/categories"
              icon={FolderTree}
              title="Category management"
              description="Manage Broad Niches and their subcategories."
            />
          ) : null}
          {isAdmin || isEditor ? (
            <QuickLink
              href="/dashboard/articles"
              icon={Users}
              title="Editorial workflow"
              description="Review content and manage publishing activity."
            />
          ) : null}
          <QuickLink
            href="/dashboard/media"
            icon={Settings2}
            title="Media approvals"
            description="Review staged assets and published media."
          />
          <QuickLink
            href="/dashboard/articles"
            icon={Send}
            title="Publishing queue"
            description="View drafts, scheduled and published content."
          />
        </div>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-sm font-medium text-slate-500">
            Loading your dashboard...
          </div>
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}
