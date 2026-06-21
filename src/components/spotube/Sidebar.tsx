"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "./Icon";
import { NAV_ITEMS } from "./types";

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden w-56 flex-shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent">
          <span className="text-[11px] font-bold text-base">F</span>
        </div>
        <span className="text-base font-semibold tracking-tight text-on-base">
          Flowz
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent-dim text-accent"
                  : "text-muted hover:bg-elevated hover:text-on-surface"
              }`}
            >
              <Icon path={item.icon} size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-elevated p-3">
          <p className="text-xs font-medium text-on-surface">Download songs</p>
          <p className="mt-0.5 text-[11px] text-muted">
            Save offline, play anywhere
          </p>
        </div>
      </div>
    </aside>
  );
}
