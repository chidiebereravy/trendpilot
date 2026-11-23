"use client";

import { useCallback, useState } from "react";

import DashboardSidebar from "@/features/dashboard/components/DashboardSidebar";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";

export default function DashboardShell({ role, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobileNavigation = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const openMobileNavigation = useCallback(() => {
    setMobileOpen(true);
  }, []);

  const toggleSidebar = useCallback(() => {
    setCollapsed((current) => !current);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#f5f6f8]">
      <DashboardSidebar
        role={role}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={closeMobileNavigation}
        onToggle={toggleSidebar}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <DashboardHeader
          role={role}
          collapsed={collapsed}
          onMenuClick={openMobileNavigation}
          onToggleSidebar={toggleSidebar}
        />

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-[10px] text-slate-500">
              © {new Date().getFullYear()} TrendPilot. All rights reserved.
            </p>

            <p className="text-[10px] text-slate-400">Content workspace</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
