import { SongCard } from "./SongCard";
import type { Track } from "@/lib/types";

// A titled, horizontally-scrollable row of song cards. Server component:
// it just renders the (client) SongCards with serializable props.
export function HomeRow({ title, tracks }: { title: string; tracks: Track[] }) {
  if (tracks.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-xl font-bold text-white">{title}</h2>
      <div className="scroll-area flex gap-4 overflow-x-auto pb-2">
        {tracks.map((track) => (
          <SongCard key={track.id} track={track} queue={tracks} />
        ))}
      </div>
    </section>
  );
}
