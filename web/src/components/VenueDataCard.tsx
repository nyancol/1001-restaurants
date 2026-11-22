import { useState } from "react";
import type { PlaceDetails } from "../lib/api";
import { useLanguage } from "../i18n/LanguageContext";

function priceLabel(level: unknown): string | null {
  const v = String(level ?? "").toUpperCase();
  if (v.includes("VERY_EXPENSIVE") || v === "$$$$") return "$$$$";
  // "INEXPENSIVE" contains "EXPENSIVE", so test the more specific name first.
  if (v.includes("INEXPENSIVE") || v === "$") return "$";
  if (v.includes("EXPENSIVE") || v === "$$$") return "$$$";
  if (v.includes("MODERATE") || v === "$$") return "$$";
  const m = String(level ?? "").match(/\$+/);
  return m ? m[0] : null;
}

/**
 * "Venue data (auto-fetched)" card: Google rating chip, price indicator chip
 * and expandable weekly opening hours. Shared by the phone add sheet and the
 * desktop add page so both show the same visuals.
 */
export default function VenueDataCard({ enrichment }: { enrichment: PlaceDetails }) {
  const { t } = useLanguage();
  const [hoursOpen, setHoursOpen] = useState(false);

  const price = priceLabel(enrichment?.priceLevel);
  const hoursList: string[] = Array.isArray(enrichment?.hours?.weekdayDescriptions)
    ? enrichment.hours.weekdayDescriptions
    : [];
  // weekdayDescriptions order is locale-dependent (Sun-first en / Mon-first fr),
  // so a fixed index slice would show arbitrary days — surface the first row.
  const hoursSummary = hoursList[0] ?? null;

  return (
    <div className="edge mb-4 rounded-xl border-transparent bg-surface-2/60 p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-want-ink">
          <span aria-hidden>✪</span> {t["add.venueData"]}
        </span>
        <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">{t["add.readOnlyBadge"]}</span>
      </div>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        {typeof enrichment.googleRating === "number" && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1 text-xs font-bold text-ink">
            <span aria-hidden className="text-star">★</span> {enrichment.googleRating.toFixed(1)}
            {typeof enrichment.googleRatingCount === "number" && (
              <span className="text-[11px] font-normal text-muted">{t["add.googleReviews"](enrichment.googleRatingCount)}</span>
            )}
          </span>
        )}
        {price && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2.5 py-1 text-xs font-bold text-ink">
            <span className="text-want-ink">{price}</span>
          </span>
        )}
      </div>
      {(hoursSummary || hoursList.length > 0) && (
        <div className="flex items-start justify-between gap-2 rounded-lg bg-surface/70 p-2.5">
          <div className="flex min-w-0 items-start gap-2">
            <span aria-hidden className="mt-0.5 shrink-0">◷</span>
            <div className="flex min-w-0 flex-col">
              <span className="text-xs font-bold leading-tight text-ink">{hoursSummary ?? hoursList[0]}</span>
              <span className="text-[11px] font-medium text-muted">{t["add.hoursToggle"](hoursOpen)}</span>
              {hoursOpen && (
                <ul className="mt-1 flex flex-col gap-0.5">
                  {hoursList.map((d, i) => (
                    <li key={i} className="text-[11px] text-muted">{d}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <button type="button" aria-label={t["add.hoursToggle"](hoursOpen)} onClick={() => setHoursOpen((o) => !o)} className="shrink-0 text-muted">
            {hoursOpen ? "︿" : "﹀"}
          </button>
        </div>
      )}
    </div>
  );
}
