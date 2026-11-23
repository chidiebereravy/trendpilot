"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Archive,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  MessageCircle,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";

import { useDashboardAnalytics } from "@/features/analytics/queries/analytics.queries";

const RANGE_OPTIONS = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

const STATUS_STYLES = {
  published: { label: "Published", color: "#16a36a" },
  draft: { label: "Draft", color: "#94a3b8" },
  in_review: { label: "In review", color: "#d6a54b" },
  scheduled: { label: "Scheduled", color: "#6489c7" },
  archived: { label: "Archived", color: "#64748b" },
};

const numberFormatter = new Intl.NumberFormat("en");

function formatNumber(value) {
  return numberFormatter.format(Number(value) || 0);
}

function formatDate(value, options = {}) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

function Panel({ title, description, action, children, className = "" }) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.025)] sm:p-6 ${className}`}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-slate-900">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyChart({ title, description }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
        <Activity size={19} />
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function MetricCard({ label, value, description, icon: Icon, accent }) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.025)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.055)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-[30px] leading-none font-semibold tracking-[-0.055em] text-slate-950 tabular-nums">
            {formatNumber(value)}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}
        >
          <Icon size={19} strokeWidth={1.8} />
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function PublicationTrend({ items }) {
  const chart = useMemo(() => {
    if (!items?.length) return null;

    const values = items.map((item) => Number(item.count) || 0);
    const max = Math.max(...values, 1);
    const width = 720;
    const height = 230;
    const left = 34;
    const right = 14;
    const top = 15;
    const bottom = 34;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;

    const points = values.map((value, index) => ({
      x:
        left +
        (values.length === 1
          ? plotWidth / 2
          : (index / (values.length - 1)) * plotWidth),
      y: top + plotHeight - (value / max) * plotHeight,
      value,
      date: items[index].date,
    }));

    const path = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    const area = `${path} L ${points[points.length - 1].x} ${top + plotHeight} L ${points[0].x} ${top + plotHeight} Z`;

    const labelIndexes = [
      ...new Set([0, Math.floor((items.length - 1) / 2), items.length - 1]),
    ];

    return {
      points,
      path,
      area,
      width,
      height,
      left,
      right,
      top,
      bottom,
      plotWidth,
      plotHeight,
      max,
      labelIndexes,
    };
  }, [items]);

  if (!items?.length || !items.some((item) => Number(item.count) > 0)) {
    return (
      <EmptyChart
        title="No published articles in this period"
        description="Publication activity will appear here when articles are published."
      />
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <span className="h-2 w-2 rounded-full bg-[#c4a16a]" />
        Published articles
      </div>
      <svg
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        role="img"
        aria-label="Published articles over time"
        className="h-auto w-full overflow-visible"
      >
        {[0, 1, 2, 3].map((step) => {
          const y = chart.top + (chart.plotHeight / 3) * step;
          return (
            <g key={step}>
              <line
                x1={chart.left}
                y1={y}
                x2={chart.width - chart.right}
                y2={y}
                stroke="#edf0f4"
                strokeDasharray="4 5"
              />
              <text
                x={chart.left - 10}
                y={y + 4}
                textAnchor="end"
                fill="#94a3b8"
                fontSize="10"
              >
                {Math.round(chart.max * (1 - step / 3))}
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient
            id="publication-area-gradient"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#c4a16a" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#c4a16a" stopOpacity="0.015" />
          </linearGradient>
        </defs>
        <path d={chart.area} fill="url(#publication-area-gradient)" />
        <path
          d={chart.path}
          fill="none"
          stroke="#b58c50"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {chart.points.map((point, index) => (
          <circle
            key={`${point.date}-${index}`}
            cx={point.x}
            cy={point.y}
            r={items.length <= 12 ? 4 : 2.6}
            fill="#ffffff"
            stroke="#b58c50"
            strokeWidth="2"
          >
            <title>
              {formatDate(point.date, { year: undefined })}: {point.value}{" "}
              published
            </title>
          </circle>
        ))}
        {chart.labelIndexes.map((index) => {
          const point = chart.points[index];
          return (
            <text
              key={index}
              x={point.x}
              y={chart.height - 7}
              textAnchor={
                index === 0
                  ? "start"
                  : index === chart.points.length - 1
                    ? "end"
                    : "middle"
              }
              fill="#94a3b8"
              fontSize="10"
            >
              {formatDate(point.date, { year: undefined })}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function StatusDistribution({ items }) {
  const total = (items || []).reduce(
    (sum, item) => sum + (Number(item.count) || 0),
    0,
  );
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  function segments() {
    let offset = 0;

    return (items || []).map((item) => {
      const count = Number(item.count) || 0;
      const length = total ? (count / total) * circumference : 0;
      const segment = { ...item, length, offset };
      offset += length;
      return segment;
    });
  }

  if (!total) {
    return (
      <EmptyChart
        title="No article records yet"
        description="Article status distribution will appear as your editorial workspace fills up."
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-7 sm:flex-row sm:justify-between">
      <div className="relative h-44 w-44 shrink-0">
        <svg
          viewBox="0 0 180 180"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label="Article status distribution"
        >
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="19"
          />
          {segments().map((segment) => (
            <circle
              key={segment.status}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={STATUS_STYLES[segment.status]?.color || "#94a3b8"}
              strokeWidth="19"
              strokeDasharray={`${Math.max(0, segment.length - 2)} ${circumference}`}
              strokeDashoffset={-segment.offset}
              strokeLinecap="butt"
            >
              <title>
                {STATUS_STYLES[segment.status]?.label || segment.status}:{" "}
                {segment.count}
              </title>
            </circle>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[27px] font-semibold tracking-tight text-slate-950 tabular-nums">
            {formatNumber(total)}
          </span>
          <span className="mt-0.5 text-[11px] text-slate-500">
            Total articles
          </span>
        </div>
      </div>
      <div className="w-full space-y-3">
        {(items || []).map((item) => {
          const style = STATUS_STYLES[item.status] || STATUS_STYLES.draft;
          const count = Number(item.count) || 0;
          return (
            <div
              key={item.status}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: style.color }}
                />
                <span className="truncate text-xs text-slate-600">
                  {style.label}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-800 tabular-nums">
                {formatNumber(count)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NicheDistribution({ items }) {
  const rows = items || [];
  const max = Math.max(...rows.map((item) => Number(item.count) || 0), 0);

  if (!rows.length || max === 0) {
    return (
      <EmptyChart
        title="No niche data to display"
        description="Published article distribution across your broad niches will appear here."
      />
    );
  }

  return (
    <div className="space-y-5">
      {rows.map((item, index) => {
        const count = Number(item.count) || 0;
        const width = max ? (count / max) * 100 : 0;

        return (
          <div key={item.name}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="truncate text-xs font-medium text-slate-700">
                {item.name}
              </span>
              <span className="text-xs font-semibold text-slate-800 tabular-nums">
                {formatNumber(count)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#c4a16a] transition-all duration-500"
                style={{ width: `${width}%`, opacity: 1 - index * 0.07 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentPublications({ items }) {
  if (!items?.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-10 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
          <BookOpen size={19} />
        </div>
        <p className="text-sm font-medium text-slate-700">
          No published stories yet
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Your latest published articles will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f8f5ef] text-[#a47c43]">
            <FileText size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm leading-5 font-medium text-slate-800">
              {item.title}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
              <span>{item.author || "Unknown author"}</span>
              {item.niche ? (
                <>
                  <span className="text-slate-300">•</span>
                  <span>{item.niche}</span>
                </>
              ) : null}
              <span className="text-slate-300">•</span>
              <span>{formatDate(item.publishedAt)}</span>
            </div>
          </div>
          <CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-600" />
        </div>
      ))}
    </div>
  );
}

function AnalyticsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-36 rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div className="h-80 rounded-2xl border border-slate-200 bg-white xl:col-span-3" />
        <div className="h-80 rounded-2xl border border-slate-200 bg-white xl:col-span-2" />
      </div>
    </div>
  );
}

function AnalyticsError({ onRetry }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <Activity size={21} />
      </div>
      <h2 className="mt-4 text-sm font-semibold text-slate-900">
        Analytics could not be loaded
      </h2>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">
        We couldn&apos;t retrieve the latest dashboard metrics. Please try
        again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700"
      >
        <RefreshCw size={14} />
        Try again
      </button>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [range, setRange] = useState("30d");
  const { data, isLoading, isError, refetch, isFetching } =
    useDashboardAnalytics(range);

  const overview = data?.overview || {};

  const metrics = [
    {
      label: "Total articles",
      value: overview.totalArticles,
      description: "Across all editorial statuses",
      icon: FileText,
      accent: "bg-slate-100 text-slate-700",
    },
    {
      label: "Published articles",
      value: overview.publishedArticles,
      description: "Live on your publication",
      icon: CheckCircle2,
      accent: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Registered users",
      value: overview.registeredUsers,
      description: "Accounts on TrendPilot",
      icon: Users,
      accent: "bg-blue-50 text-blue-700",
    },
    {
      label: "Active comments",
      value: overview.activeComments,
      description: "Visible discussion contributions",
      icon: MessageCircle,
      accent: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <div className="min-h-full bg-white px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-[#a47c43] uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c4a16a]" />
              Insights & performance
            </div>
            <h1 className="text-[27px] font-semibold tracking-[-0.045em] text-slate-950 sm:text-[32px]">
              Analytics overview
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              A clear view of your editorial activity, publishing performance,
              and community.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-500 shadow-sm">
              <CalendarDays size={15} />
              <span>Trend period</span>
            </div>
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRange(option.value)}
                  aria-pressed={range === option.value}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                    range === option.value
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <AnalyticsLoading />
        ) : isError ? (
          <AnalyticsError onRetry={() => refetch()} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <MetricCard key={metric.label} {...metric} />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
              <Panel
                title="Publishing activity"
                description={
                  range === "all"
                    ? "Monthly published article activity over the last 12 months"
                    : `Daily published article activity over the last ${range === "7d" ? "7" : range === "30d" ? "30" : "90"} days`
                }
                className="xl:col-span-3"
                action={
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f8f5ef] px-2.5 py-1.5 text-[10px] font-semibold text-[#98713d]">
                    <TrendingUp size={12} />
                    Publication trend
                  </span>
                }
              >
                <PublicationTrend items={data?.trend} />
              </Panel>

              <Panel
                title="Article status"
                description="How your editorial content is distributed"
                className="xl:col-span-2"
              >
                <StatusDistribution items={data?.status} />
              </Panel>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
              <Panel
                title="Performance by niche"
                description="Published articles grouped by broad niche"
                className="xl:col-span-3"
              >
                <NicheDistribution items={data?.niches} />
              </Panel>

              <Panel
                title="Editorial snapshot"
                description="A quick look at your publishing workflow"
                className="xl:col-span-2"
              >
                <div className="space-y-1">
                  {[
                    {
                      label: "Drafts",
                      value: overview.drafts,
                      icon: FileText,
                      color: "text-slate-500",
                      bg: "bg-slate-100",
                    },
                    {
                      label: "In review",
                      value: overview.inReview,
                      icon: Clock3,
                      color: "text-amber-700",
                      bg: "bg-amber-50",
                    },
                    {
                      label: "Scheduled",
                      value: overview.scheduled,
                      icon: CalendarDays,
                      color: "text-blue-700",
                      bg: "bg-blue-50",
                    },
                    {
                      label: "Archived",
                      value: overview.archived,
                      icon: Archive,
                      color: "text-slate-500",
                      bg: "bg-slate-100",
                    },
                    {
                      label: "Authors",
                      value: overview.authors,
                      icon: Users,
                      color: "text-violet-700",
                      bg: "bg-violet-50",
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="flex items-center justify-between rounded-xl px-3 py-3 transition hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.bg} ${item.color}`}
                          >
                            <Icon size={16} />
                          </div>
                          <span className="text-xs font-medium text-slate-600">
                            {item.label}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900 tabular-nums">
                          {formatNumber(item.value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>

            <Panel
              title="Recent publications"
              description="The six latest articles published on TrendPilot"
              action={
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                  <CheckCircle2 size={13} />
                  Published content
                </span>
              }
            >
              <RecentPublications items={data?.recentPublications} />
            </Panel>
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
          <p className="text-[11px] text-slate-400">
            Metrics are calculated from TrendPilot database records. No
            estimated traffic or engagement figures are shown.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
            Refresh data
          </button>
        </div>
      </div>
    </div>
  );
}
