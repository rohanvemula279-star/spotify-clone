"use client";

interface Props {
  title: string;
  artist: string;
  thumbnail: string;
  onClick?: () => void;
  isActive?: boolean;
  isPlaying?: boolean;
  onDownload?: () => void;
  isDownloaded?: boolean;
}

export function SongCard({
  title, artist, thumbnail, onClick, isActive, isPlaying, onDownload, isDownloaded,
}: Props) {
  return (
    <button
      onClick={onClick}
      className="group w-[160px] flex-shrink-0 text-left animate-fade-in"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-elevated">
        <img
          src={thumbnail}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Active indicator */}
        {isActive && (
          <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-accent/90 backdrop-blur-sm">
            {isPlaying ? (
              <div className="playing-indicator" style={{ color: "#0C0C0C" }}>
                <span /><span /><span />
              </div>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-base">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        )}
        {/* Download badge */}
        {isDownloaded && (
          <div className="absolute left-2 bottom-2 flex h-5 w-5 items-center justify-center rounded-md bg-success-dim text-success">
            <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current">
              <path d="M5 20h14v-2H5v2zm7-18L5.33 9h3.84v4h3.66V9h3.84L12 2z" />
            </svg>
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-sm font-medium text-on-surface">
        {title}
      </p>
      <p className="truncate text-xs text-muted">{artist}</p>
    </button>
  );
}

export function SongCardShimmer() {
  return (
    <div className="w-[160px] flex-shrink-0">
      <div className="shimmer aspect-square rounded-xl" />
      <div className="mt-2 shimmer h-3.5 w-3/4 rounded" />
      <div className="mt-1 shimmer h-3 w-1/2 rounded" />
    </div>
  );
}
