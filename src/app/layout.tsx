import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LibraryProvider } from "@/context/LibraryContext";
import { PlayerProvider } from "@/context/PlayerContext";
import { LyricsProvider } from "@/context/LyricsContext";
import { RecommendationProvider } from "@/context/RecommendationContext";
import { AppGate } from "@/components/AppGate";
import { AppShell } from "@/components/spotube/AppShell";
import { LyricsView } from "@/components/LyricsView";
import { BehaviorTracker } from "@/components/BehaviorTracker";
import { DynamicBackground } from "@/components/visual/DynamicBackground";

export const metadata: Metadata = {
  title: "Flowz",
  description:
    "Search any song, build your library, and download for offline — all on your device.",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0F",
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
    <html lang="en" className="dark">
      <body>
        <AuthProvider>
          <LibraryProvider>
            <RecommendationProvider>
              <PlayerProvider>
                <LyricsProvider>
                  <AppGate>
                    <AppShell>{children}</AppShell>
                  </AppGate>
                  <LyricsView />
                  <BehaviorTracker />
                </LyricsProvider>
              </PlayerProvider>
            </RecommendationProvider>
          </LibraryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
