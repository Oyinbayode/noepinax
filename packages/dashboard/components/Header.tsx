"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV = [
  { href: "/", label: "Observatory" },
  { href: "/gallery", label: "Gallery" },
  { href: "/live", label: "Live" },
  { href: "/agents", label: "Agents" },
  { href: "/logs", label: "Logs" },
  { href: "/economy", label: "Economy" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-[rgba(0,0,0,0.06)]">
      <div className="max-w-[1200px] mx-auto px-8 h-[52px] flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-serif text-[20px] text-stone">Noepinax</span>
          <span className="text-[11px] text-ghost tracking-wide">autonomous art economy</span>
        </Link>

        <nav className="flex items-center gap-6">
          {NAV.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "text-[13px] transition-colors",
                  active
                    ? "text-stone font-medium"
                    : "text-label hover:text-stone-secondary"
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
