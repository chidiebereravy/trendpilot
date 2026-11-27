"use client";

import {
  Bell,
  ChevronDown,
  FileText,
  FolderTree,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { useAuthSession, useLogout } from "@/features/auth/hooks/useAuth";
import { useUnreadNotificationCount } from "@/features/notifications/queries/notification.queries";
import { Users } from "lucide-react";
import { Link2 } from "lucide-react";
import { Mail } from "lucide-react";
import { Megaphone } from "lucide-react";
import { ChartNoAxesCombined } from "lucide-react";
import { FileBarChart } from "lucide-react";

const searchItems = [
  {
    label: "Dashboard overview",
    description: "View your workspace",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Article management",
    description: "Manage editorial content",
    href: "/dashboard/articles",
    icon: FileText,
  },
  {
    label: "Media library",
    description: "Manage publication images",
    href: "/dashboard/media",
    icon: Images,
  },
  {
    label: "Category management",
    description: "Manage the niche hierarchy",
    href: "/dashboard/categories",
    icon: FolderTree,
    roles: ["admin"],
  },
  {
    label: "Comments",
    description: "Manage article discussions",
    href: "/dashboard/comments",
    icon: MessageSquare,
  },
  {
    label: "Notifications",
    description: "View workspace updates and alerts",
    href: "/dashboard/notifications",
    icon: Bell,
  },
  {
    label: "User Management",
    description: "Manage workspace users",
    href: "/dashboard/users",
    icon: Users,
    roles: ["admin"],
  },
  {
    label: "Authors",
    href: "/dashboard/authors",
    description: "Manage article authors",
    icon: UserRound,
    roles: ["admin", "editor"],
  },
  {
    label: "Affiliate links",
    description: "Manage affiliate links",
    href: "/dashboard/affiliate-links",
    icon: Link2,
    roles: ["admin", "editor"],
  },
  {
    label: "Email marketing",
    description: "Manage email marketing",
    href: "/dashboard/email-marketing",
    icon: Mail,
    roles: ["admin", "editor"],
  },
  {
    label: "Advertisements",
    description: "Advertise your product",
    href: "/dashboard/advertisements",
    icon: Megaphone,
    roles: ["admin", "editor"],
  },
  {
    label: "Analytics",
    description: "View your analytics",
    href: "/dashboard/analytics",
    icon: ChartNoAxesCombined,
    roles: ["admin", "editor"],
  },
  {
    label: "Reports",
    description: "Manage your report",
    href: "/dashboard/reports",
    icon: FileBarChart,
    roles: ["admin", "editor"],
  },
  {
    label: "Apply to become an author",
    description: "Send invitation and manage your authors and editors",
    href: "/dashboard/author-application",
    icon: FileText,
    roles: ["user"],
  },
  {
    label: "SEO settings",
    description: "Send invitation and manage your authors and editors",
    href: "/dashboard/seo",
    icon: Search,
    roles: ["admin", "editor"],
  },
  {
    label: "General settings",
    description: "Send invitation and manage your authors and editors",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["admin"],
  },
];

const pageInformation = [
  {
    href: "/dashboard",
    title: "Dashboard",
    description: "Your publication at a glance",
  },
  {
    href: "/dashboard/articles",
    title: "Articles",
    description: "Manage your editorial content",
  },
  {
    href: "/dashboard/media",
    title: "Media library",
    description: "Manage images and publication assets",
  },
  {
    href: "/dashboard/categories",
    title: "Categories",
    description: "Manage your niche hierarchy",
    roles: ["admin"],
  },
  {
    href: "/dashboard/comments",
    title: "Comments",
    description: "Manage discussions across your published articles",
  },
  {
    href: "/dashboard/notifications",
    title: "Notifications",
    description: "View and manage your workspace notifications",
  },
];

function getPageInformation(pathname, role) {
  const availablePages = pageInformation.filter(
    (page) => !page.roles || page.roles.includes(role),
  );

  const currentPage = availablePages
    .filter(
      (page) => pathname === page.href || pathname.startsWith(`${page.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (!currentPage) {
    return {
      title: "Workspace",
      description: "Manage your TrendPilot publication",
    };
  }

  if (pathname !== currentPage.href) {
    return {
      title:
        pathname.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ") ||
        currentPage.title,
      description: currentPage.description,
    };
  }

  return currentPage;
}

export default function DashboardHeader({
  role,
  onMenuClick,
  onToggleSidebar,
  collapsed = false,
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [logoutError, setLogoutError] = useState("");

  const { data: session } = useAuthSession();
  const logout = useLogout();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  const accountName =
    session?.profile?.displayName ||
    session?.user?.email?.split("@")[0] ||
    "Account";

  const accountEmail = session?.user?.email || "";

  const page = getPageInformation(pathname, role);

  const results = searchItems.filter((item) => {
    const roleAllowed = !item.roles || item.roles.includes(role);

    const matchesSearch = `${item.label} ${item.description}`
      .toLowerCase()
      .includes(search.trim().toLowerCase());

    return roleAllowed && matchesSearch;
  });

  function navigateTo(href) {
    setSearch("");
    setSearchOpen(false);
    setProfileOpen(false);

    if (pathname !== href) {
      router.push(href);
    }
  }

  function handleLogout() {
    if (logout.isPending) {
      return;
    }

    setLogoutError("");

    logout.mutate(undefined, {
      onSuccess: () => {
        setProfileOpen(false);
        router.replace("/auth/login");
        router.refresh();
      },
      onError: (error) => {
        setLogoutError(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to sign out. Please try again.",
        );
      },
    });
  }

  return (
    <header className="sticky top-0 z-30 flex h-[76px] shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      {/* Left: navigation and page information */}
      <div className="flex min-w-0 items-center gap-3">
        {/* Mobile navigation */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          aria-controls="dashboard-sidebar"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-[#14243d] transition hover:border-[#c4a16a] hover:bg-slate-50 lg:hidden"
        >
          <Menu size={19} />
        </button>

        {/* Desktop sidebar toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-controls="dashboard-sidebar"
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-[#14243d] transition hover:border-[#c4a16a] hover:bg-slate-50 lg:inline-flex"
        >
          {collapsed ? (
            <PanelLeftOpen size={18} />
          ) : (
            <PanelLeftClose size={18} />
          )}
        </button>

        {/* Breadcrumb and page title */}
        <div className="min-w-0">
          {/* <nav
            aria-label="Breadcrumb"
            className="mb-1 hidden items-center gap-1.5 text-[10px] text-slate-400 sm:flex"
          >
            <Link
              href="/dashboard"
              className="transition hover:text-[#a17b43]"
              aria-label="Dashboard home"
            >
              <Home size={12} />
            </Link>

            <span>/</span>

            <span className="truncate text-slate-500 capitalize">
              {page.title}
            </span>
          </nav> */}

          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-[#14243d] sm:text-base">
              {page.title}
            </h1>

            <p className="hidden truncate text-[11px] text-slate-500 sm:block">
              {page.description}
            </p>
          </div>
        </div>
      </div>

      {/* Right: search and account */}
      <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
        {/* Workspace search */}
        <div className="relative">
          <div className="hidden w-full max-w-[290px] md:block">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setSearchOpen(false);
                  }

                  if (event.key === "Enter" && results[0]) {
                    navigateTo(results[0].href);
                  }
                }}
                aria-autocomplete="list"
                aria-controls="dashboard-search-results"
                placeholder="Search workspace..."
                aria-label="Search dashboard pages"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pr-9 pl-9 text-xs text-slate-700 transition outline-none placeholder:text-slate-400 focus:border-[#c4a16a] focus:bg-white focus:ring-2 focus:ring-[#c4a16a]/10"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSearchOpen(false);
                  }}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Search results */}
          {searchOpen && search.trim() && (
            <>
              <button
                type="button"
                aria-label="Close search results"
                onClick={() => setSearchOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />

              <div className="absolute top-12 right-0 z-20 w-[290px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl sm:w-[340px]">
                <p className="px-3 py-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Workspace results
                </p>

                {results.length > 0 ? (
                  results.map((item) => {
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => navigateTo(item.href)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-slate-50"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f5f1e9] text-[#a17b43]">
                          <Icon size={17} />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-[#14243d]">
                            {item.label}
                          </span>

                          <span className="mt-1 block text-[10px] text-slate-500">
                            {item.description}
                          </span>
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="px-3 py-4 text-xs text-slate-500">
                    No matching dashboard pages found.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <Link
          href="/dashboard/notifications"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          aria-current={
            pathname === "/dashboard/notifications" ? "page" : undefined
          }
          className={[
            "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            "border border-slate-200 text-[#14243d] transition",
            "hover:border-[#c4a16a] hover:bg-slate-50",
            pathname === "/dashboard/notifications"
              ? "border-[#c4a16a] bg-[#f5f1e9]"
              : "",
          ].join(" ")}
        >
          <Bell size={18} />

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#b4533c] px-1 text-[9px] leading-none font-bold text-white ring-2 ring-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Mobile account initials */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen((open) => !open);
              setLogoutError("");
            }}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            aria-label="Open account menu"
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-2.5 transition hover:border-[#c4a16a] hover:bg-slate-50 sm:px-3"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#14243d] text-[11px] font-bold text-white">
              {accountName.slice(0, 1).toUpperCase()}
            </span>

            <span className="hidden max-w-[120px] truncate text-xs font-semibold text-[#14243d] sm:block">
              {accountName}
            </span>

            <ChevronDown
              size={14}
              className={[
                "hidden text-slate-400 transition-transform sm:block",
                profileOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>

          {/* Account dropdown */}
          {profileOpen && (
            <>
              <button
                type="button"
                aria-label="Close account menu"
                onClick={() => setProfileOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />

              <div
                role="menu"
                aria-label="Account menu"
                className="absolute top-12 right-0 z-20 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
              >
                <div className="border-b border-slate-100 px-3 py-3">
                  <p className="truncate text-sm font-semibold text-[#14243d]">
                    {accountName}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {accountEmail}
                  </p>

                  <span className="mt-2 inline-flex rounded-md bg-[#f5f1e9] px-2 py-1 text-[10px] font-bold tracking-wider text-[#a17b43] uppercase">
                    {role || "Workspace"}
                  </span>
                </div>

                <Link
                  href="/dashboard"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <UserRound size={16} />
                  Workspace
                </Link>

                {logoutError && (
                  <p
                    role="alert"
                    className="mx-2 my-1 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-600"
                  >
                    {logoutError}
                  </p>
                )}

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={logout.isPending}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut size={16} />

                  {logout.isPending ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
