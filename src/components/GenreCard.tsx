"use client";

// Bright square genre tile used on the Search view. Title sits in the top
// corner, color fills the block.
export function GenreCard({
  title,
  color,
  onClick,
}: {
  title: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{ backgroundColor: color }}
      className="relative aspect-square overflow-hidden rounded-lg p-4 text-left transition hover:scale-[1.02]"
    >
      <span className="text-lg font-bold text-white drop-shadow-md">
        {title}
      </span>
    </button>
  );
}
