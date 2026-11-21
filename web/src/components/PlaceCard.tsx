import type { Place } from "../lib/api";
import { mapsUrlFor } from "../lib/api";
import { useEffect, useRef, useState } from "react";
import { PIN_FILL } from "../theme/pins";
import IconGlyph from "./IconGlyph";
import TagDot from "./TagDot";
import HoursSection from "./HoursSection";
import { colorForDisplay, useTagColors } from "../lib/useTagColors";
import { useLanguage, type Dict } from "../i18n/LanguageContext";

interface Props {
  place: Place;
  onToggleStatus: (p: Place) => void;
  onEdit: (p: Place) => void;
  readOnly?: boolean;
  onRefresh?: (p: Place) => Promise<unknown>;
  refreshing?: boolean;
  /** Hide the photo placeholder grid (e.g. phone list follows Stitch: text-only cards). */
  hidePhotos?: boolean;
  /** Phone list uses Stitch pill buttons (Edit/Share) + icon actions; desktop uses compact icons. */
  actionStyle?: "icons" | "pills";
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

function todayIndex(descs: string[]): number {
  const today = new Date().getDay();
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

function ratingLabel(r: number | null): string {
  if (r == null) return "";
  if (r >= 4.8) return "Exceptional";
  if (r >= 4.5) return "Superb";
  if (r >= 4.0) return "Lovely";
  if (r >= 3.0) return "Nice";
  return "Noted";
}

export default function PlaceCard({ place: p, onToggleStatus, onEdit, readOnly, onRefresh, refreshing, hidePhotos, actionStyle = "icons" }: Props) {
  const { t } = useLanguage();
  const tagColors = useTagColors();
  const [copied, setCopied] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [busyLocal, setBusyLocal] = useState(false);
  const copyTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
  }, []);
  const busy = (refreshing ?? false) || busyLocal;
  const closed = p.businessStatus === "CLOSED_PERMANENTLY";
  const tempClosed = p.businessStatus === "CLOSED_TEMPORARILY";
  const iconId = (p.icon || "fork").toLowerCase();
  const been = p.status === "BEEN_TO";
  const price = priceLabel(p);
  const personal = p.rating ?? null;
  const google = p.googleRating ?? null;

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
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  function refreshMessage(err: any, googlePlaceId: string | null, t: Dict): string {
    const status = err?.status;
    if (status === 422 || (!googlePlaceId && !status)) return t["card.noGoogle"];
    if (status === 429) return t["card.rateLimited"];
    if (status === 503 || status === 502) return t["card.googleUnavailable"];
    if (status === 403) return t["card.notAllowed"];
    return err?.message ?? t["card.refreshFailed"];
  }

  async function handleRefresh() {
    if (busy || !onRefresh) return;
    if (!p.googlePlaceId) {
      setRefreshError(t["card.noGoogle"]);
      return;
    }
    setRefreshError(null);
    setBusyLocal(true);
    try {
      await onRefresh(p);
    } catch (err: any) {
      setRefreshError(refreshMessage(err, p.googlePlaceId, t));
    } finally {
      setBusyLocal(false);
    }
  }

  return (
    <div className={closed ? "opacity-80" : ""}>
      {closed && <div className="edge radius-pill mb-2 inline-block border-danger-line bg-danger-bg px-2.5 py-1 text-xs font-semibold text-danger-ink">{t["card.closed"]}</div>}
      {tempClosed && (
        <div
          className="edge radius-pill mb-2 inline-block border-want bg-want px-2.5 py-1 text-xs font-semibold text-want-ink"
        >
          {t["card.tempClosed"]}
        </div>
      )}
      {/* Title row */}
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display min-w-0 flex-1 text-[22px] font-semibold leading-tight tracking-tight text-ink">{p.name}</h3>
        {google != null && (
          <span className="edge inline-flex items-center gap-1 border-line bg-surface-2 px-2.5 py-1 text-[13px] font-bold text-ink" style={{ borderRadius: 999 }}>
            <span aria-hidden className="text-star">★</span> {typeof google === "number" ? google.toFixed(1) : google}
            {p.googleRatingCount != null && (
              <span className="font-normal text-muted">({p.googleRatingCount})</span>
            )}
          </span>
        )}
        {google == null && personal != null && (
          <span className="edge inline-flex items-center gap-1 border-line bg-surface-2 px-2.5 py-1 text-[13px] font-bold text-ink" style={{ borderRadius: 999 }} title={t["card.googleRatingTitle"]}>
            <span aria-hidden className="text-star">★</span> {personal.toFixed(1)}
          </span>
        )}
        {readOnly ? (
          <span className={`edge inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold ${been ? "border-been bg-been text-been-ink" : "border-want bg-want text-want-ink"}`} style={{ borderRadius: 999 }}>
            {been ? t["card.beenTo"] : t["card.wantToGo"]}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onToggleStatus(p)}
            className={`edge inline-flex cursor-pointer items-center gap-1 px-2.5 py-1 text-xs font-semibold transition hover:brightness-95 ${been ? "border-been bg-been text-been-ink" : "border-want bg-want text-want-ink"}`}
            style={{ borderRadius: 999 }}
            aria-label={p.status === "WANT_TO_GO" ? t["card.markVisited"] : t["card.markWant"]}
          >
            {been ? t["card.beenTo"] : t["card.wantToGo"]}
          </button>
        )}
      </div>

      {/* Meta line */}
      {(p.address || price) && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
          {p.address && <span className="truncate">📍 {p.address}</span>}
          {p.address && price && <span aria-hidden>•</span>}
          {price && <span className="font-semibold text-ink/80">{price}</span>}
        </p>
      )}

      {/* Journal quote */}
      {p.note && (
        <blockquote className="mt-3 border-l-0 bg-surface-2/70 px-4 py-3 text-[15px] italic leading-relaxed text-ink/90" style={{ borderRadius: 12 }}>
          “{p.note}”
        </blockquote>
      )}

      {/* Photo placeholders (until photo support lands; hidden on phone list per Stitch) */}
      {!hidePhotos && p.note && (
        <div className="mt-3 grid grid-cols-2 gap-2" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="flex h-24 items-center justify-center bg-line/40 text-xs font-semibold uppercase tracking-wide text-muted" style={{ borderRadius: 12 }}>
              img
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      {(p.tags ?? []).length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {(p.tags ?? []).map((tag) => (
            <span key={tag} className="edge inline-flex items-center gap-1.5 border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink" style={{ borderRadius: 999 }}>
              <TagDot color={colorForDisplay(tag, tagColors)} />
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: hours + actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/70 pt-3 text-xs text-muted">
        <span className="inline-flex min-w-0 flex-1 items-center gap-1.5">
          <span
            className="edge radius-pill inline-flex h-7 w-7 items-center justify-center border-line text-white"
            style={{ backgroundColor: PIN_FILL, borderColor: PIN_FILL, borderRadius: 999 }}
            title={t[`icon.${iconId}`] ?? iconId}
          >
            <IconGlyph id={iconId} size={15} />
          </span>
          {openLabel(p.hours) ? (
            <HoursSection
              place={p}
              fallback={<span className="truncate">🕒 {openLabel(p.hours)}</span>}
            />
          ) : (
            <span>{google != null && personal != null ? `🅖 ${google}${p.googleRatingCount != null ? ` (${p.googleRatingCount})` : ""}` : ratingLabel(personal)}</span>
          )}
        </span>
        {!readOnly && actionStyle === "pills" && (
          <span className="inline-flex w-full items-center gap-1.5 pt-1">
            <button
              type="button"
              className="edge inline-flex min-h-[36px] items-center gap-1 border-line bg-surface-2/60 px-2.5 text-xs font-semibold text-ink hover:bg-surface-2"
              style={{ borderRadius: 999 }}
              onClick={() => onEdit(p)}
              aria-label={t["card.edit"]}
              title={t["card.edit"]}
            >
              <span aria-hidden>✎</span> {t["card.edit"]}
            </button>
            {mapsUrlFor(p) && (
              <button
                type="button"
                className="edge inline-flex min-h-[36px] items-center gap-1 border-line bg-surface-2/60 px-2.5 text-xs font-semibold text-ink hover:bg-surface-2"
                style={{ borderRadius: 999 }}
                onClick={() => void shareMaps()}
                aria-label={t["card.shareAria"]}
                title={copied ? t["card.copied"] : t["card.share"]}
              >
                <span aria-hidden>{copied ? "✓" : "⤴"}</span> {t["card.sharePill"] ?? "Share"}
              </button>
            )}
            <span className="flex-1" />
            {onRefresh && (
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-50"
                onClick={() => void handleRefresh()}
                disabled={busy || !p.googlePlaceId}
                title={!p.googlePlaceId ? t["card.noGoogle"] : t["card.refreshTitle"]}
                aria-label={busy ? t["card.refreshingAria"] : t["card.refreshAria"]}
              >
                <span aria-hidden className={busy ? "animate-spin inline-block" : "inline-block"}>↻</span>
              </button>
            )}
            {p.websiteUri && (
              <a
                href={p.websiteUri}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
                aria-label={t["card.website"]}
                title={t["card.website"]}
              >
                <span aria-hidden>↗</span>
              </a>
            )}
          </span>
        )}
        {!readOnly && actionStyle !== "pills" && (
          <span className="inline-flex items-center gap-1.5">
            <button
              type="button"
              className="edge radius-input inline-flex h-9 min-w-[36px] items-center justify-center border-line bg-surface px-2.5 text-ink hover:bg-surface-2"
              onClick={() => onEdit(p)}
              aria-label={t["card.edit"]}
              title={t["card.edit"]}
            >
              ✎
            </button>
            {onRefresh && (
              <button
                type="button"
                className="edge radius-input inline-flex h-9 items-center justify-center gap-1 border-line bg-surface px-2.5 text-ink disabled:opacity-50 hover:bg-surface-2"
                onClick={() => void handleRefresh()}
                disabled={busy || !p.googlePlaceId}
                title={!p.googlePlaceId ? t["card.noGoogle"] : t["card.refreshTitle"]}
                aria-label={busy ? t["card.refreshingAria"] : t["card.refreshAria"]}
              >
                <span aria-hidden className={busy ? "animate-spin inline-block" : "inline-block"}>↻</span>
              </button>
            )}
            {p.websiteUri && (
              <a
                href={p.websiteUri}
                target="_blank"
                rel="noreferrer"
                className="edge radius-input inline-flex h-9 min-w-[36px] items-center justify-center border-line bg-surface px-2.5 text-accent"
                aria-label={t["card.website"]}
                title={t["card.website"]}
              >
                🌐
              </a>
            )}
            {mapsUrlFor(p) && (
              <button
                type="button"
                className="edge radius-input inline-flex h-9 min-w-[36px] items-center justify-center border-line bg-surface px-2.5 text-ink hover:bg-surface-2"
                onClick={() => void shareMaps()}
                aria-label={t["card.shareAria"]}
                title={copied ? t["card.copied"] : t["card.share"]}
              >
                {copied ? "✓" : "⤴"}
              </button>
            )}
          </span>
        )}
      </div>
      {refreshError && (
        <div className="edge radius-input mt-2 border-danger-line bg-danger-bg px-2 py-1 text-xs text-danger-ink" role="alert">
          {refreshError}
        </div>
      )}
      {copied && (
        <div className="edge radius-input mt-2 border-been bg-been px-2 py-1 text-xs font-semibold text-been-ink" role="status">
          ✓ {t["card.copiedLive"]}
        </div>
      )}
      <div className="sr-only" aria-live="polite">{copied ? t["card.copiedLive"] : ""}</div>
    </div>
  );
}
