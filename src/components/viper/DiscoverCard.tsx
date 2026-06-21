"use client";

export function DiscoverCard() {
  return (
    <div className="group relative overflow-hidden rounded-3xl bg-[#C8A8FF] shadow-[0_24px_64px_-16px_rgba(200,168,255,0.5)] transition-all hover:shadow-[0_32px_80px_-16px_rgba(200,168,255,0.6)]">
      <div className="relative z-10 flex h-full min-h-[180px] flex-col justify-between p-6 md:min-h-[200px] md:p-8">
        {/* Left content */}
        <div className="max-w-[58%] md:max-w-[52%]">
          <h2 className="text-2xl font-black leading-tight text-black md:text-[28px]">
            Discover
            <br />
            weekly
          </h2>
          <p className="mt-2 text-sm leading-snug text-[#6B5B8A] md:text-[15px]">
            Your curated &amp; trending
            <br />
            daily mix for today.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1A1A22] transition-transform hover:scale-105 active:scale-95 shadow-lg">
              <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 fill-[#00FF66]">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-[#9B7FD4]/50 transition-transform hover:scale-105 active:scale-95">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-black">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Silhouette */}
      <div className="pointer-events-none absolute bottom-0 right-0 flex h-full w-[45%] items-end justify-end md:w-[40%]">
        <svg
          viewBox="0 0 180 200"
          fill="none"
          className="h-full w-full"
          preserveAspectRatio="xMaxYMax meet"
        >
          <defs>
            <filter id="discGlow">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          {/* Head */}
          <ellipse cx="100" cy="52" rx="36" ry="40" fill="#2A2A35" />
          {/* Torso */}
          <path d="M40 200c0-44 27-80 60-80s60 36 60 80" fill="#2A2A35" />
          {/* Headphones band */}
          <path
            d="M64 30c0-18 16-24 36-24s36 6 36 24"
            stroke="#00FF66"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Left earcup */}
          <rect x="58" y="26" rx="5" width="10" height="34" fill="#00FF66" />
          {/* Right earcup */}
          <rect x="132" y="26" rx="5" width="10" height="34" fill="#00FF66" />
          {/* Headband glow */}
          <path
            d="M68 34c-2-8 6-14 32-14s34 6 32 14"
            stroke="rgba(0,255,102,0.3)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            filter="url(#discGlow)"
          />
        </svg>
      </div>
    </div>
  );
}
