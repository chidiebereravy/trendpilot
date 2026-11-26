"use client";

import { useState } from "react";
import { Users, FileText, MailPlus, History } from "lucide-react";

import UserManagement from "@/features/users/components/UserManagement";
import AuthorApplicationsManager from "@/features/users/components/AuthorApplicationsManager";
import EditorInvitationsManager from "@/features/users/components/EditorInvitationsManager";
import UserRoleHistory from "@/features/users/components/UserRoleHistory";

const tabs = [
  { id: "users", label: "Users", icon: Users },
  { id: "applications", label: "Author Applications", icon: FileText },
  { id: "invitations", label: "Editor Invitations", icon: MailPlus },
  { id: "history", label: "Role History", icon: History },
];

export default function UserManagementWorkspace({ currentUserId }) {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="py-8 pb-16 sm:py-12">
      <div className="container-main">
        <div
          role="tablist"
          aria-label="User management sections"
          className="mb-6 overflow-x-auto border-b border-[#e8e9ed]"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`user-management-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`user-management-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex cursor-pointer items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "border-[#b99658] text-[#14243d]"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-[#14243d]"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`user-management-panel-${activeTab}`}
        aria-labelledby={`user-management-tab-${activeTab}`}
      >
        {activeTab === "users" && (
          <UserManagement currentUserId={currentUserId} />
        )}
        {activeTab === "applications" && <AuthorApplicationsManager />}
        {activeTab === "invitations" && (
          <div className="container-main">
            <EditorInvitationsManager />
          </div>
        )}
        {activeTab === "history" && (
          <div className="container-main">
            <UserRoleHistory />
          </div>
        )}
      </div>
    </div>
  );
}
