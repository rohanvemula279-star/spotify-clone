"use client";

interface PlaylistCardProps {
  thumbnailGradient: string;
  /** Real cover art URL. When present it replaces the gradient. */
  thumbnail?: string;
  title: string;
  subtitle: string;
  active?: boolean;
  playing?: boolean;
  onClick?: () => void;
}

export function PlaylistCard({
  thumbnailGradient,
  thumbnail,
  title,
  subtitle,
  active,
  playing,
  onClick,
}: PlaylistCardProps) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-all active:scale-[0.98] ${
        active ? "bg-[#00FF66]/10 ring-1 ring-[#00FF66]/30" : "bg-[#1A1A22] hover:bg-[#22222C]"
      }`}
    >
      <div
        className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl shadow-lg"
        style={{ background: thumbnailGradient }}
      >
        {thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-bold ${active ? "text-[#00FF66]" : "text-white"}`}
        >
          {title}
        </p>
        <p className="mt-0.5 truncate text-xs text-[#7D898D]">{subtitle}</p>
      </div>
      <div
        className={`mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
          active
            ? "text-[#00FF66] opacity-100"
            : "text-[#7D898D] opacity-0 group-hover:opacity-100"
        }`}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
            <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </div>
    </button>
  );
}
