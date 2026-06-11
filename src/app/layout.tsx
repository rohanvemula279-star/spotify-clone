import type { Metadata } from "next";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import { Sidebar } from "@/components/Sidebar";
import { Player } from "@/components/Player";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Spotube",
  description: "Spotify-style metadata, YouTube-powered audio.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* PlayerProvider owns the (off-screen) YouTube IFrame and the
            current-track state, so it must wrap both the main content
            and the bottom player bar. */}
        <PlayerProvider>
          {/* App shell: sidebar + main fill the space above an 90px
              fixed player bar. */}
          <div className="flex h-screen w-screen overflow-hidden pb-[90px]">
            <Sidebar />
            <main className="scroll-area flex-1 overflow-y-auto bg-gradient-to-b from-highlight to-base rounded-lg m-2 ml-0">
              <Header />
              {children}
            </main>
          </div>
          <Player />
        </PlayerProvider>
      </body>
    </html>
  );
}
