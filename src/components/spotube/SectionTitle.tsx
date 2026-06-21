"use client";

import { Icon } from "./Icon";

interface Props {
  title: string;
  onPlayAll?: () => void;
}

export function SectionTitle({ title, onPlayAll }: Props) {
  return (
    <div className="flex items-center justify-between px-4 pt-5 pb-2 md:px-6">
      <h2 className="text-base font-semibold text-on-surface">{title}</h2>
      {onPlayAll && (
        <button
          onClick={onPlayAll}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-elevated hover:text-on-surface"
        >
          <Icon path="M8 5v14l11-7z" size={16} />
        </button>
      )}
    </div>
  );
}
