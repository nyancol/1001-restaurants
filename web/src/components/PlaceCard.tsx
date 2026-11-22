import type { Place } from "../lib/api";
import { PIN_FILL } from "../theme/pins";
import IconGlyph from "./IconGlyph";
import TagDot from "./TagDot";
import HoursSection from "./HoursSection";
import PlaceActionBar from "./PlaceActionBar";
import { colorForDisplay, useTagColors } from "../lib/useTagColors";
import { useLanguage } from "../i18n/LanguageContext";

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

function todayIndex(descs: string[], utcOffsetMinutes?: number | null): number {
  // Day-of-week at the place's location, not the viewer's local timezone.
  const today = new Date(Date.now() + (utcOffsetMinutes ?? 0) * 60_000).getUTCDay();
  for (let i = 0; i < descs.length; i++) {
    const low = (descs[i] ?? "").toLowerCase();
    if (!low) continue;
    // Only anchor-match the leading day name ("Tuesday: ..."), never a mid-string
    // hit like "sunset"/"dim sum"/"marché", which would select the wrong weekday row.
    if (DAY_NAMES[today].some((n) => low.startsWith(n))) return i;
  }
  return -1;
}

function openLabel(hours: Place["hours"], utcOffsetMinutes?: number | null): string | null {
  const descs = (hours as any)?.weekdayDescriptions;
  if (!Array.isArray(descs) || !descs.length) return null;
  const idx = todayIndex(descs, utcOffsetMinutes);
  if (idx < 0) return null; // don't present another day's (e.g. Sunday's) hours as today's
  return descs[idx] ?? null;
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
    // Google Places priceRange snapshot: { startPrice: { units: "10", currencyCode }, endPrice: {...} }
    const fmtMoney = (v: { units?: string | number; currencyCode?: string } | null | undefined): string | null => {
      if (!v || v.units === undefined || v.units === null) return null;
      const n = Number(v.units);
      if (Number.isNaN(n)) return null;
      return v.currencyCode ? `${v.units} ${v.currencyCode}` : `€${n}`;
    };
    const legacyFmt = (v: any) => (typeof v === "number" ? `€${v}` : v?.currencyCode && v?.units ? `${v.units} ${v.currencyCode}` : null);
    const start = fmtMoney((range as any).startPrice) ?? legacyFmt((range as any).start ?? (range as any).min ?? (range as any).low);
    const end = fmtMoney((range as any).endPrice) ?? legacyFmt((range as any).end ?? (range as any).max ?? (range as any).high);
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

function isHttpUrl(url: string | null | undefined): boolean {
  return !!url && /^https?:\/\//i.test(url);
}

function ratingLabel(r: number | null): string {
  if (r == null) return "";
  if (r >= 4.8) return "Exceptional";
  if (r >= 4.5) return "Superb";
  if (r >= 4.0) return "Lovely";
  if (r >= 3.0) return "Nice";
  return "Noted";
}

export default function PlaceCard({ place: p, onToggleStatus, onEdit, readOnly, onRefresh, refreshing }: Props) {
  const { t } = useLanguage();
  const tagColors = useTagColors();
  const closed = p.businessStatus === "CLOSED_PERMANENTLY";
  const tempClosed = p.businessStatus === "CLOSED_TEMPORARILY";
  const iconId = (p.icon || "fork").toLowerCase();
  const been = p.status === "BEEN_TO";
  const price = priceLabel(p);
  const personal = p.rating ?? null;
  const google = p.googleRating ?? null;

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
          {openLabel(p.hours, p.utcOffsetMinutes) ? (
            <HoursSection
              place={p}
              fallback={<span className="truncate">🕒 {openLabel(p.hours, p.utcOffsetMinutes)}</span>}
            />
          ) : (
            <span>{google != null && personal != null ? `🅖 ${google}${p.googleRatingCount != null ? ` (${p.googleRatingCount})` : ""}` : ratingLabel(personal)}</span>
          )}
          {!readOnly && isHttpUrl(p.websiteUri) && (
            <a
              href={p.websiteUri}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
              aria-label={t["card.website"]}
              title={t["card.website"]}
            >
              <span aria-hidden>↗</span>
            </a>
          )}
        </span>
        <span className="inline-flex w-full items-center gap-1.5 pt-1">
          <PlaceActionBar place={p} onEdit={onEdit} onRefresh={onRefresh} refreshing={refreshing} readOnly={readOnly} />
        </span>
      </div>
    </div>
  );
}
