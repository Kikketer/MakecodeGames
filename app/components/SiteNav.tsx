"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Games", href: "/games" },
  { label: "Extensions", href: "/extensions" },
  { label: "Compilers", href: "/compilers" },
  // { label: "One Minute Arcade", href: "/arcade" },
];

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (pathname.startsWith(`${href}/`)) return true;
  // Treat the root redirect as Games
  if (href === "/games" && pathname === "/") return true;
  return false;
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-4 flex flex-wrap gap-2" aria-label="Site">
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-2 border-makecode-white px-4 py-2 font-sans text-sm font-bold transition ${
              active
                ? "bg-makecode-red text-white hover:bg-makecode-pink"
                : "bg-makecode-cyan text-makecode-black hover:bg-makecode-yellow"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
