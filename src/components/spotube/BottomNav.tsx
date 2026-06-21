"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "./Icon";
import { NAV_ITEMS } from "./types";

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isSubPage = !["/", "/search", "/library", "/settings"].includes(pathname);
  if (isSubPage) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-base/95 backdrop-blur-lg md:hidden">
      <div className="flex items-center justify-around py-1.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-4 py-1 transition-colors ${
                active ? "text-accent" : "text-muted hover:text-on-surface"
              }`}
            >
              <Icon path={item.icon} size={20} />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
