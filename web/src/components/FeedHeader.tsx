export type SortId = "recent" | "rating" | "name";

interface Props {
  total: number;
  sort: SortId;
  setSort: (s: SortId) => void;
}

export default function FeedHeader({ total, sort, setSort }: Props) {
  return (
    <div className="edge radius-card mb-4 flex flex-wrap items-center gap-2 border-line bg-surface p-3 shadow-theme" style={{ borderRadius: 16 }}>
      <h2 className="font-display mr-auto text-[26px] font-semibold tracking-tight text-ink">
        Saved Tables{" "}
        <span className="ml-1 align-middle text-xs font-normal text-muted">({total} entries)</span>
      </h2>
      <label className="edge inline-flex items-center gap-1 bg-surface-2 py-1 pl-3 pr-1 text-sm" style={{ borderRadius: 999 }}>
        <span className="sr-only">Sort</span>
        <select
          aria-label="Sort saved tables"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortId)}
          className="bg-transparent text-sm font-semibold text-ink outline-none"
        >
          <option value="recent">Recently Saved</option>
          <option value="rating">Top Rated</option>
          <option value="name">Name A–Z</option>
        </select>
        <span aria-hidden className="pr-1 text-muted">▾</span>
      </label>
    </div>
  );
}

export function sortPlaces<T extends { name: string; rating?: number | null; createdAt?: number | string; updatedAt?: number | string }>(places: T[], sort: SortId): T[] {
  const arr = [...places];
  if (sort === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "rating") arr.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  else arr.sort((a, b) => (Number(b.updatedAt ?? b.createdAt ?? 0) || 0) - (Number(a.updatedAt ?? a.createdAt ?? 0) || 0));
  return arr;
}
