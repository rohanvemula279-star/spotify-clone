import { SearchView } from "@/components/SearchView";

export const dynamic = "force-dynamic";

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  // Key by the query so navigating /search?q=a -> /search?q=b remounts the
  // view and re-runs the search (instead of being blocked by its init guard).
  return (
    <SearchView key={searchParams.q ?? ""} initialQuery={searchParams.q ?? ""} />
  );
}
