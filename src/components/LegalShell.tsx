"use client";

import Link from "next/link";

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-6 md:py-12">
      <div>
        <Link
          href="/settings"
          className="mb-4 inline-flex items-center gap-1 text-xs text-muted hover:text-on-surface"
        >
          ← Back to Settings
        </Link>
        <h1 className="text-lg font-bold text-on-base">{title}</h1>
        <p className="mt-1 text-xs text-dim">Last updated: {updated}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
