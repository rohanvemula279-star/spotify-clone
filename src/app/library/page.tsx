"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LibraryView } from "@/components/LibraryView";

function LibraryInner() {
  const params = useSearchParams();
  const folder = params.get("folder") ?? undefined;
  // Key by folder so navigating between folders remounts with the right tab.
  return <LibraryView key={folder ?? "all"} folderId={folder} />;
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading…</div>}>
      <LibraryInner />
    </Suspense>
  );
}
