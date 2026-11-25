"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Search } from "lucide-react";

import { useAuthSession, useLogout } from "@/features/auth/hooks/useAuth";

const navigation = [
  { label: "Home", href: "/" },
  { label: "Business", href: "/category/business" },
  { label: "Technology", href: "/category/technology" },
  { label: "Finance", href: "/category/finance" },
  { label: "Education", href: "/category/education" },
  { label: "Lifestyle", href: "/category/lifestyle" },
  { label: "Innovation", href: "/category/innovation" },
  { label: "About", href: "/about" },
];

function isActiveLink(pathname, href) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function AuthLinks({ session, onNavigate, onLogout, logoutPending }) {
  if (session) {
    const accountLabel =
      session.profile?.displayName ||
      session.user?.email?.split("@")[0] ||
      "Account";

    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span
          className="max-w-[180px] truncate text-sm font-semibold text-[#26354a]"
          title={session.user?.email || accountLabel}
        >
          {accountLabel}
        </span>

        <button
          type="button"
          onClick={onLogout}
          disabled={logoutPending}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-[#dfe2e8] px-4 py-2.5 text-xs font-semibold text-[#26354a] transition hover:border-[#b99658] hover:text-[#98743d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut size={15} aria-hidden="true" />
          {logoutPending ? "Signing out..." : "Sign out"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Link
        href="/auth/login"
        onClick={onNavigate}
        className="rounded-sm border border-[#dfe2e8] px-4 py-2.5 text-center text-xs font-semibold text-[#26354a] transition hover:border-[#b99658] hover:text-[#98743d]"
      >
        Sign in
      </Link>

      <Link
        href="/auth/register"
        onClick={onNavigate}
        className="rounded-sm bg-[#14243d] px-4 py-2.5 text-center text-xs font-semibold !text-white transition hover:bg-[#203653]"
      >
        Create account
      </Link>
    </div>
  );
}

function NavigationLink({ item, pathname, mobile = false, onClick }) {
  const active = isActiveLink(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={
        mobile
          ? active
            ? "rounded-md bg-[#f5f1e8] px-3 py-3 text-sm font-bold text-[#98743d] ring-1 ring-[#d5b77e]/30"
            : "rounded-md px-3 py-3 text-sm font-semibold text-[#4b5563] transition-colors duration-200 hover:bg-[#f7f8fa] hover:text-[#98743d]"
          : `nav-link ${active ? "active" : ""}`
      }
    >
      {item.label}
    </Link>
  );
}

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const { data: session } = useAuthSession();
  const logout = useLogout();

  {
    navigation.map((item) => (
      <NavigationLink
        key={item.href}
        item={item}
        pathname={pathname}
        mobile
        onClick={() => setMenuOpen(false)}
      />
    ));
  }

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        closeMenu();
        router.refresh();
      },
    });
  }

  if (pathname.includes("/auth")) {
    return null;
  }

  return (
    <header className="site-header sticky top-0 z-50">
      <div className="container-main">
        <div className="flex min-h-[76px] items-center justify-between gap-4">
          {/* Brand */}
          <Link
            href="/"
            className="brand shrink-0"
            aria-label="TrendPilot homepage"
            onClick={closeMenu}
          >
            TrendPilot<span className="brand-dot">.</span>
          </Link>

          {/* Desktop navigation */}
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-5 xl:flex"
          >
            {navigation.map((item) => (
              <NavigationLink key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>

          {/* Header actions */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/search"
              aria-label="Search articles"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-[#b99658] hover:text-[#b99658]"
            >
              <Search size={18} aria-hidden="true" />
            </Link>

            <Link
              href="/newsletter"
              className="hidden rounded-sm bg-[#14243d] px-4 py-3 text-xs font-semibold !text-white transition hover:bg-[#203653] sm:block"
            >
              Subscribe
            </Link>

            <div className="hidden items-center gap-3 xl:flex">
              <AuthLinks
                session={session}
                onNavigate={closeMenu}
                onLogout={handleLogout}
                logoutPending={logout.isPending}
              />
            </div>

            {/* Mobile menu toggle */}
            <button
              type="button"
              aria-label={
                menuOpen ? "Close navigation menu" : "Open navigation menu"
              }
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-gray-200 text-[#14243d] transition-colors duration-200 hover:border-[#b99658] hover:text-[#98743d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b99658] xl:hidden"
            >
              <span className="relative block h-5 w-5" aria-hidden="true">
                <span
                  className={`absolute top-1/2 left-0 h-0.5 w-5 -translate-y-1/2 rounded-full bg-current transition-transform duration-300 ease-in-out ${
                    menuOpen ? "rotate-45" : "-translate-y-[7px]"
                  }`}
                />

                <span
                  className={`absolute top-1/2 left-0 h-0.5 w-5 -translate-y-1/2 rounded-full bg-current transition-opacity duration-200 ease-in-out ${
                    menuOpen ? "opacity-0" : "opacity-100"
                  }`}
                />

                <span
                  className={`absolute top-1/2 left-0 h-0.5 w-5 -translate-y-1/2 rounded-full bg-current transition-transform duration-300 ease-in-out ${
                    menuOpen ? "-rotate-45" : "translate-y-[7px]"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Mobile navigation overlay */}
        <div
          id="mobile-navigation"
          aria-hidden={!menuOpen}
          inert={!menuOpen}
          className={`absolute inset-x-0 top-full z-50 w-full overflow-hidden border-t border-gray-100 bg-white shadow-xl transition-[max-height,opacity,transform] duration-300 ease-in-out xl:hidden ${
            menuOpen
              ? "max-h-[620px] translate-y-0 py-4 opacity-100"
              : "pointer-events-none max-h-0 -translate-y-2 py-0 opacity-0"
          }`}
        >
          <div className="container-main">
            <nav
              aria-label="Mobile navigation"
              className="grid grid-cols-2 gap-x-5 gap-y-1 sm:grid-cols-3"
            >
              {navigation.map((item) => (
                <NavigationLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onClick={closeMenu}
                  mobile
                />
              ))}
            </nav>

            <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3 sm:hidden">
                <Link
                  href="/newsletter"
                  onClick={closeMenu}
                  className="flex-1 rounded-sm bg-[#14243d] px-4 py-3 text-center text-xs font-semibold !text-white transition hover:bg-[#203653]"
                >
                  Subscribe
                </Link>

                <Link
                  href="/search"
                  onClick={closeMenu}
                  className="flex-1 rounded-sm border border-[#dfe2e8] px-4 py-3 text-center text-xs font-semibold text-[#26354a] transition hover:border-[#b99658]"
                >
                  Search
                </Link>
              </div>

              <AuthLinks
                session={session}
                onNavigate={closeMenu}
                onLogout={handleLogout}
                logoutPending={logout.isPending}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
