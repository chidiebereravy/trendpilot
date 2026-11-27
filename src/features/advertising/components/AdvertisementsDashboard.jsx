"use client";

import { useState } from "react";
import CampaignManagement from "@/features/advertising/components/CampaignManagement";
import NetworkManagement from "@/features/advertising/components/NetworkManagement";
import AdvertiserManagement from "@/features/advertising/components/AdvertiserManagement";
import PlacementManagement from "@/features/advertising/components/PlacementManagement";
import SponsoredContentManagement from "@/features/advertising/components/SponsoredContentManagement";

import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Globe2,
  LayoutGrid,
  Mail,
  Megaphone,
  MousePointerClick,
  Newspaper,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";

import { useAdvertisementsOverview } from "@/features/advertising/queries/advertising.queries";

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function MetricCard({ label, value, detail, icon: Icon, accent = "gold" }) {
  const accentClasses =
    accent === "navy"
      ? "bg-[#14243d]/[0.06] text-[#14243d]"
      : "bg-[#c4a16a]/15 text-[#a17b43]";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.025)] transition hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#14243d]">
            {formatNumber(value)}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
        </div>

        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accentClasses}`}
        >
          <Icon size={20} strokeWidth={1.8} />
        </span>
      </div>
    </article>
  );
}

function SectionCard({ icon: Icon, title, description, children, id }) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.025)] sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5f1e9] text-[#a17b43]">
          <Icon size={19} strokeWidth={1.8} />
        </span>

        <div className="min-w-0">
          <h2 className="font-semibold text-[#14243d]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">{children}</div>
    </section>
  );
}

function OverviewLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-[#14243d] tabular-nums">
        {formatNumber(value)}
      </span>
    </div>
  );
}

function LoadingDashboard() {
  return (
    <div className="space-y-7">
      <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}

export default function AdvertisementsDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdvertisementsOverview();

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <LoadingDashboard />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-[1500px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-900">
            Advertising overview unavailable
          </h2>
          <p className="mt-2 text-sm leading-6 text-red-800">
            {error?.response?.data?.error?.message ||
              "We could not retrieve the advertising overview. Please try again."}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#14243d] px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-[#203858]"
          >
            <RefreshCw size={15} />
            Try again
          </button>
        </div>
      </div>
    );
  }

  const workspace = data.workspace;
  const administrator = data.administrator;
  const isAdmin = data.role === "admin";

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-8 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-8 text-slate-900 shadow-sm sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -top-28 -right-20 h-72 w-72 rounded-full border border-slate-200/70" />
        <div className="pointer-events-none absolute -top-12 -right-5 h-52 w-52 rounded-full border border-[#c4a16a]/25" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c4a16a]/30 bg-[#f5f1e9] px-3 py-1.5 text-xs font-medium text-[#8b6b3f]">
              <Megaphone size={14} />
              Monetization workspace
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#14243d] sm:text-4xl">
              Advertising &amp; Monetization
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Manage advertising channels, sponsored campaigns, placements, and
              email marketing from one central workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-[#14243d] transition hover:bg-slate-50 disabled:opacity-60 lg:self-auto"
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
            Refresh overview
          </button>
        </div>
      </header>

      <nav
        aria-label="Advertising workspace sections"
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-3"
      >
        {[
          { id: "overview", label: "Overview" },
          { id: "campaigns", label: "Campaigns" },
          { id: "sponsored-content", label: "Sponsored Content" },
          { id: "placements", label: "Ad Placements" },
          ...(isAdmin
            ? [
                { id: "networks", label: "Ad Networks" },
                { id: "advertisers", label: "Advertisers" },
              ]
            : []),
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-[#14243d] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <>
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#14243d]">
                  Workspace overview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Live record counts from your advertising workspace.
                </p>
              </div>
              <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 sm:inline-flex">
                <CheckCircle2 size={13} className="mr-1.5" />
                Database connected
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Active ad placements"
                value={workspace.placements.active}
                detail={`${formatNumber(workspace.placements.total)} total placements`}
                icon={LayoutGrid}
              />
              <MetricCard
                label="Active campaigns"
                value={workspace.campaigns.active}
                detail={`${formatNumber(workspace.campaigns.scheduled)} scheduled`}
                icon={Megaphone}
                accent="navy"
              />
              <MetricCard
                label="Published sponsored content"
                value={workspace.sponsoredContent.published}
                detail={`${formatNumber(workspace.sponsoredContent.total)} total records`}
                icon={Newspaper}
              />
              <MetricCard
                label="Email campaigns sending"
                value={workspace.emailCampaigns.sending}
                detail={`${formatNumber(workspace.emailCampaigns.scheduled)} scheduled`}
                icon={Mail}
                accent="navy"
              />
            </div>
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[#14243d]">
                Monetization channels
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Separate channels designed to work together as TrendPilot grows.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <SectionCard
                id="ad-networks"
                icon={Globe2}
                title="Ad networks"
                description="Connect and manage Google AdSense and other third-party advertising networks."
              >
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
                    Google AdSense
                  </span>
                  <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
                    Other ad networks
                  </span>
                </div>
                {isAdmin && administrator && (
                  <div className="mt-4 divide-y divide-slate-100">
                    <OverviewLine
                      label="Connected networks"
                      value={administrator.networks.connected}
                    />
                    <OverviewLine
                      label="Network accounts"
                      value={administrator.networks.total}
                    />
                  </div>
                )}
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Provider integrations and credential management will be added
                  in the network management phase.
                </p>
              </SectionCard>

              <SectionCard
                id="direct-campaigns"
                icon={Megaphone}
                title="Direct advertising & campaigns"
                description="Manage advertiser campaigns, sponsored promotions, and campaign schedules."
              >
                <div className="divide-y divide-slate-100">
                  <OverviewLine
                    label="All campaigns"
                    value={workspace.campaigns.total}
                  />
                  <OverviewLine
                    label="Active campaigns"
                    value={workspace.campaigns.active}
                  />
                  <OverviewLine
                    label="Scheduled campaigns"
                    value={workspace.campaigns.scheduled}
                  />
                </div>
              </SectionCard>

              <SectionCard
                id="email-marketing"
                icon={Mail}
                title="Email marketing"
                description="A dedicated channel for newsletters, promotional campaigns, and subscriber communications."
              >
                <div className="divide-y divide-slate-100">
                  <OverviewLine
                    label="Email campaigns"
                    value={workspace.emailCampaigns.total}
                  />
                  <OverviewLine
                    label="Currently sending"
                    value={workspace.emailCampaigns.sending}
                  />
                  <OverviewLine
                    label="Scheduled"
                    value={workspace.emailCampaigns.scheduled}
                  />
                </div>
                {isAdmin && administrator && (
                  <div className="mt-3 rounded-xl bg-[#f8f6f1] p-3">
                    <p className="text-xs font-medium text-[#14243d]">
                      Subscriber overview
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-[#14243d]">
                      {formatNumber(administrator.subscribers.subscribed)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Subscribed contacts
                    </p>
                  </div>
                )}
              </SectionCard>

              <SectionCard
                id="reporting"
                icon={BarChart3}
                title="Performance & revenue reporting"
                description="Build a transparent view of impressions, clicks, conversions, and monetization revenue."
              >
                <div className="divide-y divide-slate-100">
                  <OverviewLine
                    label="Daily metric records"
                    value={workspace.metrics.records}
                  />
                  {isAdmin && administrator && (
                    <>
                      <OverviewLine
                        label="Revenue records"
                        value={administrator.revenue.records}
                      />
                      <OverviewLine
                        label="Confirmed revenue records"
                        value={administrator.revenue.confirmedRecords}
                      />
                      <OverviewLine
                        label="Paid revenue records"
                        value={administrator.revenue.paidRecords}
                      />
                    </>
                  )}
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Revenue amounts and performance totals will be presented after
                  verified aggregation and reporting are implemented. No
                  estimated figures are invented here.
                </p>
              </SectionCard>
            </div>
          </section>

          {isAdmin && administrator && (
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#14243d]">
                  Administrator overview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Additional operational counts available to administrators
                  only.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <MetricCard
                  label="Active advertisers"
                  value={administrator.advertisers.active}
                  detail={`${formatNumber(administrator.advertisers.total)} total advertiser records`}
                  icon={Users}
                />
                <MetricCard
                  label="Subscribed contacts"
                  value={administrator.subscribers.subscribed}
                  detail={`${formatNumber(administrator.subscribers.total)} total subscriber records`}
                  icon={Mail}
                  accent="navy"
                />
                <MetricCard
                  label="Paid revenue records"
                  value={administrator.revenue.paidRecords}
                  detail={`${formatNumber(administrator.revenue.records)} total revenue records`}
                  icon={CircleDollarSign}
                />
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <ShieldCheck
                  size={19}
                  className="mt-0.5 shrink-0 text-[#a17b43]"
                />
                <p className="text-xs leading-6 text-slate-500">
                  Subscriber records, advertiser contact details, and financial
                  records are restricted to administrator workflows. This
                  overview displays aggregate counts only.
                </p>
              </div>
            </section>
          )}
        </>
      ) : activeTab === "campaigns" ? (
        <CampaignManagement isAdmin={data?.role === "admin"} />
      ) : activeTab === "sponsored-content" ? (
        <SponsoredContentManagement isAdmin={isAdmin} />
      ) : activeTab === "placements" ? (
        <PlacementManagement />
      ) : activeTab === "networks" && isAdmin ? (
        <NetworkManagement />
      ) : activeTab === "advertisers" && isAdmin ? (
        <AdvertiserManagement />
      ) : (
        <CampaignManagement isAdmin={isAdmin} />
      )}

      <footer className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>TrendPilot Monetization Workspace</span>
        <span className="inline-flex items-center gap-1.5">
          <Activity size={13} />
          Overview counts are retrieved from the database
        </span>
      </footer>
    </div>
  );
}
