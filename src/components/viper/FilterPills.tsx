"use client";

import { motion } from "framer-motion";

const PILLS = ["All", "New Release", "Trending"] as const;

interface FilterPillsProps {
  active: string;
  onChange: (label: string) => void;
}

export function FilterPills({ active, onChange }: FilterPillsProps) {
  return (
    <div className="flex gap-2">
      {PILLS.map((label) => {
        const isActive = label === active;
        return (
          <motion.button
            key={label}
            whileTap={{ scale: 0.94 }}
            onClick={() => onChange(label)}
            className={
              isActive
                ? "rounded-full bg-[#00FF66] px-5 py-1.5 text-sm font-bold text-black shadow-[0_0_12px_rgba(0,255,102,0.3)]"
                : "rounded-full border border-white/[0.08] bg-black/20 px-5 py-1.5 text-sm font-medium text-[#7D898D] backdrop-blur-sm hover:text-white/80"
            }
          >
            {label}
          </motion.button>
        );
      })}
    </div>
  );
}
