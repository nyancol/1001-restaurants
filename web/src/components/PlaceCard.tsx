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
          <div className="font-medium">{p.name}</div>
          {p.address && <div className="text-sm text-slate-500">{p.address}</div>}
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
            <span className={`rounded-full px-2 py-0.5 ${p.status === "BEEN_TO" ? "bg-green-200" : "bg-amber-200"}`}>
              {p.status === "BEEN_TO" ? "Been to" : "Want to go"}
            </span>
            {p.tags.map((t) => (
              <span key={t} className="rounded-full bg-slate-200 px-2 py-0.5">
                {t}
              </span>
            ))}
            {p.rating != null && <span className="text-amber-600">{"★".repeat(p.rating)}</span>}
          </div>
          {p.note && <div className="mt-1 text-sm">{p.note}</div>}
        </div>
        <button
          type="button"
          onClick={() => onToggleStatus(p)}
          className="shrink-0 rounded border px-2 py-1 text-xs"
          aria-label={p.status === "WANT_TO_GO" ? "mark visited" : "mark want to go"}
        >
          {p.status === "WANT_TO_GO" ? "✓ visited" : "↩ want"}
        </button>
      </div>
      <button type="button" className="mt-2 text-sm text-slate-600 underline" onClick={() => onEdit(p)}>
        Edit tags / stars / note
      </button>
    </div>
  );
}
