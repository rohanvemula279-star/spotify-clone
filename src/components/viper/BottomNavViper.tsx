"use client";

import { useRouter, usePathname } from "next/navigation";

const NAV = [
  { id: "home", href: "/viper", icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" },
  { id: "search", href: "/search", icon: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" },
  { id: "library", href: "/library", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
  { id: "trending", href: "/viper", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { id: "profile", href: "/settings", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
];

export function BottomNavViper() {
  const router = useRouter();
  const pathname = usePathname();

  function isActive(item: { id: string; href: string }): boolean {
    if (item.id === "home") return pathname === "/" || pathname === "/viper";
    if (item.id === "trending") return false;
    return pathname.startsWith(item.href);
  }

  return (
    <nav className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 md:hidden">
      <div className="flex items-center gap-1 rounded-full bg-[#1A1A22]/95 px-3 py-2 shadow-2xl shadow-black/50 backdrop-blur-2xl ring-1 ring-white/[0.06]">
        {NAV.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 ${
                active
                  ? "bg-[#00FF66] text-black shadow-[0_0_16px_rgba(0,255,102,0.5)]"
                  : "text-[#7D898D] hover:text-white"
              }`}
            >
              <svg viewBox="0 0 24 24" className={`h-5 w-5 ${active ? "fill-black" : "fill-current"}`}>
                <path d={item.icon} />
              </svg>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
