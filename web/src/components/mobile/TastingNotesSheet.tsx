import type { Place } from "../../lib/api";
import BottomSheet from "./BottomSheet";
import PlaceActionBar from "../PlaceActionBar";

function displayRating(p: Place): string | null {
  const r = p.googleRating ?? p.rating ?? null;
  if (r == null) return null;
  const v = r <= 5.5 ? r * 2 : r;
  return v.toFixed(1);
}

function priceLabel(p: Place): string | null {
  const level = p.priceLevel ? String(p.priceLevel) : null;
  const map: Record<string, string> = {
    PRICE_LEVEL_FREE: "$",
    PRICE_LEVEL_INEXPENSIVE: "$",
    PRICE_LEVEL_MODERATE: "$$",
    PRICE_LEVEL_EXPENSIVE: "$$$",
    PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
    INEXPENSIVE: "$",
    MODERATE: "$$",
    EXPENSIVE: "$$$",
    VERY_EXPENSIVE: "$$$$",
  };
  if (level && map[level]) return map[level];
  if (level && /^\$+$/.test(level.trim())) return level.trim();
  return null;
}

function addedLabel(updatedAt: number): string {
  try {
    const s = new Date(updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `Added ${s}`;
  } catch {
    return "";
  }
}

interface Props {
  place: Place | null;
  onClose: () => void;
  onEdit: (p: Place) => void;
  onToggleStatus: (p: Place) => void;
  onRefresh?: (p: Place) => Promise<unknown>;
  refreshing?: boolean;
  readOnly?: boolean;
}

/** Phone "Expanded Tasting Notes" sheet from Stitch. */
export default function TastingNotesSheet({ place, onClose, onEdit, onToggleStatus, onRefresh, refreshing, readOnly }: Props) {
  const rating = place ? displayRating(place) : null;
  const price = place ? priceLabel(place) : null;
  const been = place?.status === "BEEN_TO";

  return (
    <BottomSheet open={place != null} onClose={onClose} ariaLabel="Tasting notes">
      {place && (
        <>
          <div className="flex items-center gap-2 px-4 pb-1 pt-1">
            {readOnly ? (
              <span
                className={`edge inline-flex min-h-[40px] items-center gap-1.5 border-transparent px-3.5 text-sm font-bold ${been ? "bg-been text-been-ink" : "bg-want text-want-ink"}`}
                style={{ borderRadius: 999 }}
              >
                <span aria-hidden>{been ? "✓" : "🔖"}</span> {been ? "Been" : "Want to go"}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onToggleStatus(place)}
                className="edge inline-flex min-h-[40px] items-center gap-1.5 border-transparent bg-been px-3.5 text-sm font-bold text-been-ink"
                style={{ borderRadius: 999 }}
              >
                <span aria-hidden>{been ? "✓" : "🔖"}</span> {been ? "Been" : "Want to go"}
              </button>
            )}
            {rating && (
              <span className="edge inline-flex items-center gap-1 border-transparent bg-want px-2.5 py-2 text-sm font-bold text-want-ink" style={{ borderRadius: 12 }}>
                <span aria-hidden>★</span> {rating}
              </span>
            )}
            <span className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close tasting notes"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2/70 text-xl text-ink"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ overscrollBehavior: "contain" }}>
            <h2 className="font-display text-[28px] font-bold leading-tight text-ink">{place.name}</h2>
            <p className="mt-0.5 text-sm text-muted">
              {place.address ?? "Paris"}
              {price ? ` • ${price}` : ""}
            </p>

            {place.note && (
              <div className="edge mt-3 border-line/60 bg-surface-2/40 p-3.5" style={{ borderRadius: 12 }}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink">
                    <span aria-hidden>📝</span> My Personal Note
                  </span>
                  <span className="text-xs text-muted">{addedLabel(place.updatedAt)}</span>
                </div>
                <p className="text-[15px] leading-relaxed text-ink/90">“{place.note}”</p>
              </div>
            )}

            {(place.tags ?? []).length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {(place.tags ?? []).map((tg) => (
                    <span
                      key={tg}
                      className="edge inline-flex min-h-[36px] items-center border-line/50 bg-surface-2/60 px-3 text-sm font-medium text-ink"
                      style={{ borderRadius: 999 }}
                    >
                      #{tg}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="h-2" />
          </div>

          <div className="border-t border-line/60 bg-[#fff8e8] p-4">
            <PlaceActionBar place={place} onEdit={onEdit} onRefresh={onRefresh} refreshing={refreshing} readOnly={readOnly} />
          </div>
        </>
      )}
    </BottomSheet>
  );
}
