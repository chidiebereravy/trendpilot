"use client";

import { useState } from "react";

import EmailCampaignManagement from "./EmailCampaignManagement";
import EmailSubscriberManagement from "./EmailSubscriberManagement";
import EmailCampaignReports from "./EmailCampaignReports";

const tabs = [
  { id: "campaigns", label: "Campaigns" },
  { id: "subscribers", label: "Subscribers", adminOnly: true },
  { id: "reports", label: "Reports", adminOnly: true },
];

export default function EmailMarketingWorkspace({ role }) {
  const isAdmin = role === "admin";
  const [activeTab, setActiveTab] = useState("campaigns");

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Email Marketing
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage newsletter campaigns and your subscriber audience.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Email marketing sections"
        className="flex flex-wrap gap-2 border-b border-slate-200"
      >
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`email-marketing-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`email-marketing-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`cursor-pointer border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-[#c4a16a] text-slate-900"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "campaigns" && (
        <div
          role="tabpanel"
          id="email-marketing-panel-campaigns"
          aria-labelledby="email-marketing-tab-campaigns"
        >
          <EmailCampaignManagement role={role} />
        </div>
      )}

      {activeTab === "subscribers" && isAdmin && (
        <div
          role="tabpanel"
          id="email-marketing-panel-subscribers"
          aria-labelledby="email-marketing-tab-subscribers"
        >
          <EmailSubscriberManagement />
        </div>
      )}

      {activeTab === "reports" && isAdmin && (
        <div
          role="tabpanel"
          id="email-marketing-panel-reports"
          aria-labelledby="email-marketing-tab-reports"
        >
          <EmailCampaignReports />
        </div>
      )}
    </section>
  );
}
