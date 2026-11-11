import type { Place } from "../lib/api";

interface Props {
  place: Place;
  onToggleStatus: (p: Place) => void;
  onEdit: (p: Place) => void;
}

export default function PlaceCard({ place: p, onToggleStatus, onEdit }: Props) {
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-display font-medium text-ink">{p.name}</div>
          {p.address && <div className="text-sm text-muted">{p.address}</div>}
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
            <span
              className={`edge radius-pill px-2 py-0.5 ${p.status === "BEEN_TO" ? "border-been bg-been text-been-ink" : "border-want bg-want text-want-ink"}`}
            >
              {p.status === "BEEN_TO" ? "Been to" : "Want to go"}
            </span>
            {p.tags.map((t) => (
              <span key={t} className="edge radius-pill border-line bg-surface-2 px-2 py-0.5 text-ink">
                {t}
              </span>
            ))}
            {p.rating != null && <span className="text-star">{"★".repeat(p.rating)}</span>}
          </div>
          {p.note && <div className="mt-1 text-sm text-ink">{p.note}</div>}
        </div>
        <button
          type="button"
          onClick={() => onToggleStatus(p)}
          className="edge radius-input shrink-0 border-line bg-surface px-2 py-1 text-xs text-ink"
          aria-label={p.status === "WANT_TO_GO" ? "mark visited" : "mark want to go"}
        >
          {p.status === "WANT_TO_GO" ? "✓ visited" : "↩ want"}
        </button>
      </div>
      <button type="button" className="mt-2 text-sm text-muted underline hover:text-ink" onClick={() => onEdit(p)}>
        Edit tags / stars / note
      </button>
    </div>
  );
}
