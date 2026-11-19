import Link from "next/link";
import { Search } from "lucide-react";

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

export default function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-50">
      <div className="container-main">
        <div className="flex min-h-[76px] items-center justify-between gap-5">
          <Link
            href="/"
            className="brand shrink-0"
            aria-label="TrendPilot homepage"
          >
            TrendPilot<span className="brand-dot">.</span>
          </Link>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-6 lg:flex"
          >
            {navigation.map((item) => (
              <Link key={item.label} href={item.href} className="nav-link">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-4">
            <Link
              href="/search"
              aria-label="Search articles"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-[#b99658] hover:text-[#b99658]"
            >
              <Search size={18} />
            </Link>

            <Link
              href="/newsletter"
              className="hidden rounded-sm bg-[#14243d] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#203653] sm:block"
            >
              Subscribe
            </Link>
          </div>
        </div>

        <nav
          aria-label="Mobile navigation"
          className="flex gap-5 overflow-x-auto border-t border-gray-100 py-3 lg:hidden"
        >
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="nav-link shrink-0"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
