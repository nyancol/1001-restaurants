import type { Place } from "../../lib/api";

/** Floating preview card from Stitch "Places mobile - map view". Rating matches the list view (Google rating + count). */
export default function PhoneMapPreview({ place: p, onClose, onViewNotes }: { place: Place; onClose?: () => void; onViewNotes?: (p: Place) => void }) {
  const google = p.googleRating ?? null;
  const personal = p.rating ?? null;
  return (
    <div className="edge border-accent bg-surface p-3 shadow-theme" style={{ borderRadius: 16, borderWidth: 2 }}>
      <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-ink/15" aria-hidden />
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display truncate text-lg font-bold text-ink">{p.name}</h3>
            {google != null ? (
              <span className="edge inline-flex shrink-0 items-center gap-1 border-transparent bg-want px-2 py-0.5 text-xs font-bold text-want-ink" style={{ borderRadius: 8 }}>
                <span aria-hidden>★</span> {typeof google === "number" ? google.toFixed(1) : google}
                {p.googleRatingCount != null && (
                  <span className="font-normal">({p.googleRatingCount})</span>
                )}
              </span>
            ) : personal != null ? (
              <span className="edge inline-flex shrink-0 items-center gap-1 border-transparent bg-want px-2 py-0.5 text-xs font-bold text-want-ink" style={{ borderRadius: 8 }}>
                <span aria-hidden>★</span> {personal.toFixed(1)}
              </span>
            ) : null}
            <span className="edge ml-auto inline-flex shrink-0 items-center gap-1 border-transparent bg-been px-2 py-1 text-[11px] font-bold text-been-ink" style={{ borderRadius: 999 }}>
              🔖 Saved
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">
            {p.address ?? "Paris"} • {p.priceLevel?.includes("$") ? p.priceLevel : "$$$"}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#7a4a00]">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
            No Reservations • Line up 6:45 PM
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close preview" className="-mr-1 -mt-1 h-8 w-8 shrink-0 text-lg text-muted">
            ×
          </button>
        )}
      </div>
      <div className="mt-3">
        <button
          type="button"
          onClick={() => onViewNotes?.(p)}
          className="edge inline-flex min-h-[48px] w-full items-center justify-center gap-2 border-accent bg-accent px-4 text-sm font-bold text-accent-ink"
          style={{ borderRadius: 12 }}
        >
          <span aria-hidden>📝</span> View Tasting Notes
        </button>
      </div>
    </div>
  );
}
