import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LibraryProvider } from "@/context/LibraryContext";
import { PlayerProvider } from "@/context/PlayerContext";
import { AppGate } from "@/components/AppGate";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { Player } from "@/components/Player";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Spotube",
  description:
    "Search any song, build your library, and download for offline — all on your device.",
};

// Mobile-first viewport: lock zoom so the PWA/APK feels like a native app and
// cover the notch area on phones.
export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Provider order matters: Auth (who) → Library (their data) →
            Player (which reads Library for offline blobs). AppGate sits
            inside so the onboarding screens can use auth state. */}
        <AuthProvider>
          <LibraryProvider>
            <PlayerProvider>
              <AppGate>
                {/* App shell: sidebar (desktop) + main fill the space above the
                    bottom bars. On mobile the sidebar is replaced by MobileNav,
                    so we reserve room for both the nav (56px) and player (64px);
                    on desktop just the 90px player. */}
                <div className="flex h-screen w-screen overflow-hidden pb-[120px] md:pb-[90px]">
                  <Sidebar />
                  <main className="scroll-area m-2 flex-1 overflow-y-auto rounded-lg bg-gradient-to-b from-highlight to-base md:ml-0">
                    <Header />
                    {children}
                  </main>
                </div>
                <MobileNav />
                <Player />
              </AppGate>
            </PlayerProvider>
          </LibraryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
