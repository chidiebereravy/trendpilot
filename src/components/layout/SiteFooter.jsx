"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const footerLinks = [
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Advertise", href: "/advertise" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms" },
];

export default function SiteFooter() {
  const pathname = usePathname();

  if (pathname.includes("/auth")) {
    return null;
  }

  return (
    <footer className="site-footer mt-20">
      <div className="container-main py-14">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Link href="/" className="brand !text-white">
              TrendPilot<span className="brand-dot">.</span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-7 text-gray-400">
              Navigate ideas. Discover opportunities. Explore thoughtful
              insights, useful knowledge and perspectives that matter.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">
              Explore TrendPilot
            </h2>

            <div className="mt-5 flex flex-col gap-3">
              {footerLinks.slice(0, 3).map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-sm text-gray-400 transition hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">Information</h2>

            <div className="mt-5 flex flex-col gap-3">
              {footerLinks.slice(3).map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-sm text-gray-400 transition hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <p className="text-xs text-gray-500">
            © TrendPilot. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
