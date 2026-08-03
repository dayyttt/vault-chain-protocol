"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Launch" },
  { href: "/explore", label: "Explore" },
  { href: "/docs", label: "Docs" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigasi utama" className="flex items-center gap-1">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-primary ${
              active
                ? "bg-accent-primary/10 text-accent-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
