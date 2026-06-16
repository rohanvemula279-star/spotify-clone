import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LibraryProvider } from "@/context/LibraryContext";
import { PlayerProvider } from "@/context/PlayerContext";
import { AppGate } from "@/components/AppGate";
import { Sidebar } from "@/components/Sidebar";
import { Player } from "@/components/Player";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Spotube",
  description:
    "Search any song, build your library, and download for offline — all on your device.",
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
                {/* App shell: sidebar + main fill the space above the 90px
                    fixed player bar. */}
                <div className="flex h-screen w-screen overflow-hidden pb-[90px]">
                  <Sidebar />
                  <main className="scroll-area flex-1 overflow-y-auto bg-gradient-to-b from-highlight to-base rounded-lg m-2 ml-0">
                    <Header />
                    {children}
                  </main>
                </div>
                <Player />
              </AppGate>
            </PlayerProvider>
          </LibraryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
