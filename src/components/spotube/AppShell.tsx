"use client";

import { usePathname, useRouter } from "next/navigation";
import { DesktopSidebar } from "@/components/viper/DesktopSidebar";
import { BottomNavViper } from "@/components/viper/BottomNavViper";
import { MiniPlayer } from "./MiniPlayer";
import { OfflineBanner } from "@/components/OfflineBanner";
import { usePlayer } from "@/context/PlayerContext";

// Routes that render with NO app chrome (full-screen).
const NO_SHELL = ["/login", "/signup", "/api-key", "/viper/now-playing"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { track } = usePlayer();

  if (NO_SHELL.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0F0F13] text-white">
      {/* Persistent Viper sidebar (desktop) */}
      <DesktopSidebar />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <OfflineBanner />
        <main className="scroll-area flex-1 overflow-y-auto">{children}</main>

        {/* Mini player sits above the floating mobile nav. */}
        {track && (
          <div className="mb-[84px] md:mb-0">
            <MiniPlayer onExpand={() => router.push("/viper/now-playing")} />
          </div>
        )}
      </div>

      {/* Floating Viper bottom nav (mobile) */}
      <BottomNavViper />
    </div>
  );
}
