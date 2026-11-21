import type { Place } from "../lib/api";

interface Props {
  place: Place;
  onViewNotes: (p: Place) => void;
  onClose?: () => void;
}

export default function MapPreviewCard({ place: p, onViewNotes, onClose }: Props) {
  const rating = p.rating ?? p.googleRating ?? null;
  const area = p.address ? p.address.split(",").slice(0, 2).join(",") : "Paris";
  return (
    <div className="edge radius-card border-line bg-surface p-3 shadow-theme" style={{ borderRadius: 16 }}>
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-line/40 text-[10px] font-bold uppercase tracking-wide text-muted" style={{ borderRadius: 12 }} aria-hidden>
          img
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display truncate text-lg font-semibold text-ink">{p.name}</h3>
            {rating != null && (
              <span className="edge ml-auto inline-flex shrink-0 items-center gap-1 border-line bg-surface-2 px-2 py-0.5 text-xs font-bold text-ink" style={{ borderRadius: 999 }}>
                ★ {typeof rating === "number" ? rating.toFixed(1) : rating}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">{area} • Seafood &amp; Natural Wine Bar • $$$</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close preview" className="text-muted hover:text-ink">×</button>
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">● No Reservations • Line up 6:45 PM</span>
        <button
          type="button"
          onClick={() => onViewNotes(p)}
          className="edge ml-auto inline-flex min-h-[40px] items-center border-accent bg-accent px-4 text-[13px] font-semibold text-accent-ink"
          style={{ borderRadius: 999 }}
        >
          View Tasting Notes
        </button>
      </div>
    </div>
  );
}
