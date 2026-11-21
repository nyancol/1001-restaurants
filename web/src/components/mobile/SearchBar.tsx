interface Props {
  q: string;
  setQ: (q: string) => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
}

/** Phone search row from Stitch: rounded search + sliders filter button. */
export default function SearchBar({ q, setQ, onOpenFilters, activeFilterCount }: Props) {
  return (
    <div className="flex gap-2">
      <label className="edge flex min-h-[48px] flex-1 items-center gap-2 border-line bg-surface-2/60 px-4" style={{ borderRadius: 16 }}>
        <span aria-hidden className="text-lg text-muted">⌕</span>
        <span className="sr-only">Search dishes, spots, arrondissements</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Dishes, spots, arrondissements..."
          enterKeyHint="search"
          className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
        />
        {q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQ("")}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink/10 text-sm text-muted"
          >
            ×
          </button>
        )}
      </label>
      <button
        type="button"
        onClick={onOpenFilters}
        aria-label={activeFilterCount > 0 ? `Open filters, ${activeFilterCount} active` : "Open filters"}
        className="edge relative inline-flex min-h-[48px] min-w-[48px] items-center justify-center border-line bg-surface-2/60 text-ink"
        style={{ borderRadius: 16 }}
      >
        <svg aria-hidden width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <circle cx="9" cy="7" r="2.2" fill="var(--surface)" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <circle cx="15" cy="12" r="2.2" fill="var(--surface)" />
          <line x1="4" y1="17" x2="20" y2="17" />
          <circle cx="8" cy="17" r="2.2" fill="var(--surface)" />
        </svg>
        {activeFilterCount > 0 && (
          <span
            className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center px-1 text-[11px] font-bold text-white"
            style={{ backgroundColor: "#b44c2e", borderRadius: 999 }}
            aria-hidden
          >
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  );
}
