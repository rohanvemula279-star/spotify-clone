"use client";

import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { id: "home", label: "Home", href: "/viper", icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" },
  { id: "search", label: "Search", href: "/search", icon: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" },
  { id: "library", label: "Library", href: "/library", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
  { id: "trending", label: "Trending", href: "/viper", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { id: "profile", label: "Profile", href: "/settings", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(item: { id: string; href: string }): boolean {
    if (item.id === "home") return pathname === "/" || pathname === "/viper";
    if (item.id === "trending") return false;
    return pathname.startsWith(item.href);
  }

  return (
    <aside className="hidden h-screen w-64 flex-shrink-0 flex-col border-r border-white/[0.04] bg-[#050507] md:flex">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 pt-8 pb-7">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00FF66] shadow-[0_0_20px_rgba(0,255,102,0.25)]">
          <span className="text-base font-black tracking-tight text-black">V</span>
        </div>
        <span className="text-lg font-bold tracking-tight text-white">flowz</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-[#00FF66]/10 text-[#00FF66]"
                  : "text-[#7D898D] hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-5 w-5 shrink-0 ${active ? "fill-[#00FF66]" : "fill-current"}`}
              >
                <path d={item.icon} />
              </svg>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom card */}
      <div className="px-4 pb-6">
        <div className="rounded-2xl bg-gradient-to-br from-[#1A1A22] to-[#14141A] p-4 ring-1 ring-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#00FF66]/20 to-[#00FF66]/5">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#00FF66]">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white">flowz Playlist</p>
              <p className="mt-0.5 truncate text-[11px] text-[#7D898D]">Your daily dose of heat</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
