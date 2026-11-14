import type { Place } from "../lib/api";
import { mapsUrlFor } from "../lib/api";
import { useState } from "react";
import { colorForType, emojiFor } from "../theme/pins";

interface Props {
  place: Place;
  onToggleStatus: (p: Place) => void;
  onEdit: (p: Place) => void;
  readOnly?: boolean;
  onRefresh?: (p: Place) => Promise<unknown>;
  refreshing?: boolean;
}

const DAY_NAMES: string[][] = [
  ["sunday", "sun", "dimanche", "dim"],
  ["monday", "mon", "lundi", "lun"],
  ["tuesday", "tue", "tues", "mardi", "mar"],
  ["wednesday", "wed", "mercredi", "mer"],
  ["thursday", "thu", "thur", "thurs", "jeudi", "jeu"],
  ["friday", "fri", "vendredi", "ven"],
  ["saturday", "sat", "samedi", "sam"],
];

/** Find today's line in Google's weekdayDescriptions regardless of Sunday/Monday-first order. */
function todayIndex(descs: string[]): number {
  const today = new Date().getDay(); // 0=Sunday, matches Google Period.day
  for (let i = 0; i < descs.length; i++) {
    const low = (descs[i] ?? "").toLowerCase();
    if (!low) continue;
    if (DAY_NAMES[today].some((n) => low.startsWith(n) || low.includes(n))) return i;
  }
  return -1;
}

function openLabel(hours: Place["hours"]): string | null {
  const descs = (hours as any)?.weekdayDescriptions;
  if (!Array.isArray(descs) || !descs.length) return null;
  const idx = todayIndex(descs);
  return (idx >= 0 ? descs[idx] : descs[0]) ?? null;
}

function weekLines(hours: Place["hours"]): string[] {
  const descs = (hours as any)?.weekdayDescriptions;
  return Array.isArray(descs) ? descs.filter((d) => typeof d === "string" && d) : [];
}

function priceLabel(p: Place): string | null {
  const level = p.priceLevel ? String(p.priceLevel) : null;
  const levelSymbols: Record<string, string> = {
    PRICE_LEVEL_FREE: "Gratuit",
    PRICE_LEVEL_INEXPENSIVE: "€",
    PRICE_LEVEL_MODERATE: "€€",
    PRICE_LEVEL_EXPENSIVE: "€€€",
    PRICE_LEVEL_VERY_EXPENSIVE: "€€€€",
    INEXPENSIVE: "€",
    MODERATE: "€€",
    EXPENSIVE: "€€€",
    VERY_EXPENSIVE: "€€€€",
  };
  const range = p.priceRange;
  let rangeText: string | null = null;
  if (typeof range === "string" && range) rangeText = range;
  else if (range && typeof range === "object") {
    const fmt = (v: any) => (typeof v === "number" ? `€${v}` : v?.currencyCode && v?.units ? `${v.units} ${v.currencyCode}` : null);
    const start = fmt(range.start ?? range.min ?? range.low);
    const end = fmt(range.end ?? range.max ?? range.high);
    if (start || end) rangeText = [start, end].filter(Boolean).join(" – ");
  }
  if (!level && !rangeText) return null;
  if (level && rangeText) {
    const sym = levelSymbols[level] ?? level.replace(/PRICE_LEVEL_/g, "").replace(/_/g, " ").toLowerCase();
    return `${sym} · ${rangeText}`;
  }
  if (level) return levelSymbols[level] ?? level.replace(/PRICE_LEVEL_/g, "").replace(/_/g, " ").toLowerCase();
  return rangeText;
}

export default function PlaceCard({ place: p, onToggleStatus, onEdit, readOnly, onRefresh, refreshing }: Props) {
  const [copied, setCopied] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [busyLocal, setBusyLocal] = useState(false);
  const busy = (refreshing ?? false) || busyLocal;
  const closed = p.businessStatus === "CLOSED_PERMANENTLY";
  const tempClosed = p.businessStatus === "CLOSED_TEMPORARILY";
  const typeColor = colorForType(p.placeType || "restaurant");
  const typeEmoji = emojiFor(p.placeType || "restaurant");
  const cardTone = closed ? "opacity-70" : "";

  async function shareMaps() {
    const url = mapsUrlFor(p);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function refreshMessage(err: any): string {
    const status = err?.status;
    if (status === 422 || (!p.googlePlaceId && !status)) return "No Google link — refresh unavailable";
    if (status === 429) return "Rate-limited — try again later";
    if (status === 503 || status === 502) return "Google unavailable — try again later";
    if (status === 403) return "Not allowed for this place";
    return err?.message ?? "Refresh failed — try again";
  }

  async function handleRefresh() {
    if (busy || !onRefresh) return;
    if (!p.googlePlaceId) {
      setRefreshError("No Google link — refresh unavailable");
      return;
    }
    setRefreshError(null);
    setBusyLocal(true);
    try {
      await onRefresh(p);
    } catch (err: any) {
      setRefreshError(refreshMessage(err));
    } finally {
      setBusyLocal(false);
    }
  }

  return (
    <div className={cardTone}>
      {closed && <div className="edge radius-pill mb-2 inline-block border-danger-line bg-danger-bg px-2 py-0.5 text-xs font-medium text-danger-ink">⛔ Closed permanently</div>}
      {tempClosed && (
        <div
          className="edge radius-pill mb-2 inline-block border-want bg-want px-2 py-0.5 text-xs font-medium text-want-ink"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0,0,0,0.08) 6px, rgba(0,0,0,0.08) 12px)" }}
        >
          🚧 Temporarily closed
        </div>
      )}
      <div className={`flex items-start justify-between gap-2 ${closed ? "grayscale" : ""}`}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="edge radius-pill inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: typeColor, borderColor: typeColor }}
              title={`Type: ${p.placeType}`}
            >
              <span aria-hidden>{typeEmoji}</span> {p.placeType || "restaurant"}
            </span>
            <span
              className={`edge radius-pill px-2 py-0.5 text-xs ${p.status === "BEEN_TO" ? "border-been bg-been text-been-ink" : "border-want bg-want text-want-ink"}`}
            >
              {p.status === "BEEN_TO" ? "✓ Been to" : "○ Want to go"}
            </span>
          </div>
          <div className="font-display mt-1 text-base font-medium leading-tight text-ink">{p.name}</div>
          {p.address && <div className="truncate text-sm text-muted">📍 {p.address}</div>}
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onToggleStatus(p)}
            className="edge radius-input shrink-0 border-line bg-surface px-2 py-1 text-xs text-ink"
            aria-label={p.status === "WANT_TO_GO" ? "mark visited" : "mark want to go"}
          >
            {p.status === "WANT_TO_GO" ? "✓ visited" : "↩ want"}
          </button>
        )}
      </div>

      <dl className="mt-2 flex flex-col gap-1 text-xs">
        {weekLines(p.hours).length > 0 && (
          <details className="edge radius-input border-line bg-surface-2 px-2 py-1">
            <summary className="cursor-pointer text-ink">
              <span aria-hidden>🕒</span> {openLabel(p.hours)}
              <span className="ml-1 text-muted">· all 7 days</span>
            </summary>
            <ul className="mt-1 flex flex-col gap-0.5">
              {weekLines(p.hours).map((d, i) => (
                <li key={i} className={i === todayIndex(weekLines(p.hours)) ? "font-medium text-ink" : "text-muted"}>
                  {i === todayIndex(weekLines(p.hours)) ? "▸ " : ""}{d}
                </li>
              ))}
            </ul>
            <dt className="sr-only">Hours</dt>
          </details>
        )}
        {priceLabel(p) && (
          <div className="flex items-center gap-1.5">
            <span aria-hidden>💶</span>
            <dt className="sr-only">Price</dt>
            <dd className="text-ink">{priceLabel(p)}</dd>
          </div>
        )}
        {(p.rating != null || p.googleRating != null) && (
          <div className="flex flex-wrap items-center gap-2">
            {p.rating != null && (
              <span className="edge radius-pill border-line bg-surface-2 px-2 py-0.5 text-ink">
                <span className="text-star">{"★".repeat(Math.max(0, Math.min(5, Math.round(p.rating))))}</span>
                <span className="ml-1 text-muted">you</span>
              </span>
            )}
            {p.googleRating != null && (
              <span className="edge radius-pill border-line bg-surface-2 px-2 py-0.5 text-ink" title="Google rating">
                <span aria-hidden>🅖</span> {p.googleRating}{p.googleRatingCount != null ? <span className="text-muted"> ({p.googleRatingCount})</span> : null}
              </span>
            )}
          </div>
        )}
      </dl>

      {p.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {p.tags.map((t) => (
            <span key={t} className="edge radius-pill border-line bg-surface-2 px-2 py-0.5 text-xs text-ink">
              #{t}
            </span>
          ))}
        </div>
      )}
      {p.note && <div className="mt-1.5 border-l-2 border-line pl-2 text-sm text-ink">{p.note}</div>}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
        {!readOnly && (
          <button type="button" className="edge radius-input inline-flex min-h-[40px] items-center border-line bg-surface px-3 text-xs text-ink" onClick={() => onEdit(p)}>
            ✏️ Edit
          </button>
        )}
        {!readOnly && onRefresh && (
          <button
            type="button"
            className="edge radius-input inline-flex min-h-[40px] items-center border-line bg-surface px-3 text-xs text-ink disabled:opacity-50"
            onClick={() => void handleRefresh()}
            disabled={busy || !p.googlePlaceId}
            title={!p.googlePlaceId ? "No Google link — refresh unavailable" : "Re-fetch Google details"}
            aria-label={busy ? "refreshing place" : "refresh place from Google"}
          >
            {busy ? "↻ Refreshing…" : "↻ Refresh"}
          </button>
        )}
        {p.websiteUri && (
          <a href={p.websiteUri} target="_blank" rel="noreferrer" className="edge radius-input inline-flex min-h-[40px] items-center border-line bg-surface px-3 text-xs text-accent">
            🌐 Website
          </a>
        )}
        {mapsUrlFor(p) && (
          <button type="button" className="edge radius-input inline-flex min-h-[40px] items-center border-line bg-surface px-3 text-xs text-ink" onClick={() => void shareMaps()} aria-label="copy Google Maps link">
            {copied ? "✓ Link copied" : "🔗 Share Maps link"}
          </button>
        )}
      </div>
      {refreshError && (
        <div className="edge radius-input mt-2 border-danger-line bg-danger-bg px-2 py-1 text-xs text-danger-ink" role="alert">
          {refreshError}
        </div>
      )}
      <div className="sr-only" aria-live="polite">{copied ? "Google Maps link copied" : ""}</div>
    </div>
  );
}
