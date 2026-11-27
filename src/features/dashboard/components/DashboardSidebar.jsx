"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Images,
  FolderTree,
  PlusCircle,
  MessageSquare,
  Users,
  UserRound,
  ChartNoAxesCombined,
  FileBarChart,
  Megaphone,
  Link2,
  Search,
  Settings,
  UserCircle,
  Bell,
  ChevronLeft,
  ChevronRight,
  X,
  Compass,
  Clock3,
} from "lucide-react";
import { Mail } from "lucide-react";
import TrendPilotLogo from "@/components/layout/TrendPilotLogo";

const navigation = [
  {
    label: "Workspace",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Publishing",
    items: [
      {
        label: "All articles",
        href: "/dashboard/articles",
        icon: FileText,
      },
      {
        label: "New article",
        href: "/dashboard/articles/new",
        icon: PlusCircle,
      },
      {
        label: "Categories",
        href: "/dashboard/categories",
        icon: FolderTree,
        roles: ["admin"],
      },
    ],
  },
  {
    label: "Media",
    items: [
      {
        label: "Media library",
        href: "/dashboard/media",
        icon: Images,
      },
    ],
  },
  {
    label: "Community",
    items: [
      {
        label: "Comments",
        href: "/dashboard/comments",
        icon: MessageSquare,
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        label: "User Management",
        href: "/dashboard/users",
        icon: Users,
        roles: ["admin"],
      },
      {
        label: "Authors",
        href: "/dashboard/authors",
        icon: UserRound,
        roles: ["admin", "editor"],
      },
      {
        label: "Apply to become an author",
        href: "/dashboard/author-application",
        icon: FileText,
        roles: ["user"],
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        label: "Analytics",
        href: "/dashboard/analytics",
        icon: ChartNoAxesCombined,
        roles: ["admin", "editor"],
      },
      {
        label: "Reports",
        href: "/dashboard/reports",
        icon: FileBarChart,
        roles: ["admin", "editor"],
      },
    ],
  },
  {
    label: "Monetization",
    items: [
      {
        label: "Advertisements",
        href: "/dashboard/advertisements",
        icon: Megaphone,
        roles: ["admin", "editor"],
      },
      {
        label: "Affiliate links",
        href: "/dashboard/affiliate-links",
        icon: Link2,
        roles: ["admin", "editor"],
      },
      {
        label: "Email marketing",
        href: "/dashboard/email-marketing",
        icon: Mail,
        roles: ["admin", "editor"],
      },
    ],
  },
  {
    label: "Configuration",
    items: [
      {
        label: "SEO settings",
        href: "/dashboard/seo",
        icon: Search,
        roles: ["admin", "editor"],
      },
      {
        label: "General settings",
        href: "/dashboard/settings",
        icon: Settings,
        roles: ["admin"],
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        label: "My profile",
        href: "/dashboard/profile",
        icon: UserCircle,
      },
      {
        label: "Notifications",
        href: "/dashboard/notifications",
        icon: Bell,
      },
    ],
  },
];

export default function DashboardSidebar({
  role,
  collapsed = false,
  mobileOpen = false,
  onClose,
  onToggle,
}) {
  const pathname = usePathname();

  function isActive(href) {
    if (href === "/dashboard") {
      return pathname === href;
    }

    const normalizedHref = href.split("/").slice(-1).join("");

    return pathname.endsWith(`/${normalizedHref}`);
  }

  function closeMobileNavigation() {
    onClose?.();
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={closeMobileNavigation}
          className="fixed inset-0 z-40 bg-[#0b1728]/50 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Main sidebar */}
      <aside
        id="dashboard-sidebar"
        aria-label="Dashboard navigation"
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[278px] flex-col",
          "border-r border-slate-200 bg-white text-[#14243d]",
          "transition-[transform,width] duration-300 ease-in-out",
          "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          collapsed ? "lg:w-[88px]" : "lg:w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Brand header */}
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-slate-200 px-5">
          <Link
            href="/dashboard"
            onClick={closeMobileNavigation}
            aria-label="TrendPilot dashboard home"
            className="flex min-w-0 items-center gap-3"
          >
            
            <TrendPilotLogo isText={false} />
          </Link>

          {/* Mobile close */}
          <button
            type="button"
            onClick={closeMobileNavigation}
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#14243d] lg:hidden"
          >
            <X size={19} />
          </button>

          {/* Desktop collapse */}
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#14243d] lg:inline-flex"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation groups */}
        <div className="flex-1 overflow-y-auto px-3 py-6">
          {navigation.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.roles || item.roles.includes(role),
            );

            if (visibleItems.length === 0) {
              return null;
            }

            return (
              <div key={group.label} className="mb-7">
                <p
                  className={[
                    "mb-3 px-3 text-[10px] font-bold tracking-[0.18em] text-slate-400 uppercase",
                    collapsed ? "lg:hidden" : "",
                  ].join(" ")}
                >
                  {group.label}
                </p>

                <nav aria-label={group.label} className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = !item.comingSoon && isActive(item.href);

                    const itemClassName = [
                      "group flex min-h-11 items-center gap-3 rounded-xl px-3",
                      "text-sm font-medium transition-colors duration-200",
                      active
                        ? "bg-[#f5f1e9] text-[#14243d] shadow-sm"
                        : item.comingSoon
                          ? "cursor-not-allowed text-slate-400"
                          : "text-slate-600 hover:bg-slate-50 hover:text-[#14243d]",
                      collapsed ? "lg:justify-center lg:px-0" : "",
                    ].join(" ");

                    const itemContent = (
                      <>
                        <Icon
                          size={19}
                          strokeWidth={active ? 2.2 : 1.8}
                          className={[
                            "shrink-0 transition-colors",
                            active
                              ? "text-[#a17b43]"
                              : item.comingSoon
                                ? "text-slate-300"
                                : "text-slate-500 group-hover:text-[#14243d]",
                          ].join(" ")}
                        />

                        <span
                          className={[
                            "whitespace-nowrap",
                            collapsed ? "lg:hidden" : "",
                          ].join(" ")}
                        >
                          {item.label}
                        </span>

                        {!collapsed && item.comingSoon && (
                          <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-1 text-[9px] font-semibold text-slate-500">
                            <Clock3 size={10} />
                            Soon
                          </span>
                        )}

                        {active && !collapsed && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#c4a16a]" />
                        )}
                      </>
                    );

                    if (item.comingSoon) {
                      return (
                        <div
                          key={item.href}
                          aria-disabled="true"
                          title={
                            collapsed
                              ? `${item.label} â€” Coming soon`
                              : undefined
                          }
                          className={itemClassName}
                        >
                          {itemContent}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMobileNavigation}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={itemClassName}
                      >
                        {itemContent}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        {/* Workspace identity */}
        <div className="shrink-0 border-t border-slate-200 p-4">
          <div
            className={[
              "flex items-center gap-3 rounded-xl bg-slate-50 p-3",
              collapsed ? "lg:justify-center lg:px-0" : "",
            ].join(" ")}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#c4a16a]/15 text-[#a17b43]">
              <Compass size={18} />
            </span>

            <div className={collapsed ? "lg:hidden" : ""}>
              <p className="text-xs font-semibold text-[#14243d]">
                TrendPilot CMS
              </p>

              <p className="mt-0.5 text-[10px] text-slate-500 capitalize">
                {role || "Workspace"}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
