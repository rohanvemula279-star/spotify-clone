"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SearchView } from "@/components/SearchView";

function SearchInner() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  // Key by the query so navigating ?q=a -> ?q=b remounts and re-runs search.
  return <SearchView key={q} initialQuery={q} />;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading…</div>}>
      <SearchInner />
    </Suspense>
  );
}
