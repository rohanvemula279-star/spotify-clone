"use client";

export function Icon({
  path,
  className,
  size = 24,
}: {
  path: string;
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "fill-current"}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}
