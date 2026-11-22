import { useState } from "react";
import type { Place } from "../lib/api";
import { openNowFor, weekRowsFor } from "../lib/hours";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  place: Place;
  fallback?: React.ReactNode;
}

/**
 * Weekly opening hours from Stitch "Mobile Expanded Opening Hours".
 * Collapsed: open/closed status dot. Click unfolds the full Mon→Sun week
 * with today highlighted; click again (or chevron) collapses.
 */
export default function HoursSection({ place: p, fallback }: Props) {
  const { t, locale } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const openNow = openNowFor(p);
  const rows = weekRowsFor(p, locale);

  if (openNow == null || rows.length === 0) {
    return <>{fallback ?? null}</>;
  }

  const todayRow = rows.find((r) => r.isToday);

  return (
    <span className="inline min-w-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={
          expanded
            ? String(t["hours.hideWeek"] ?? "Hide full week hours")
            : String(t["hours.showWeek"] ?? "Show full week hours")
        }
        title={
          expanded
            ? String(t["hours.hideWeek"] ?? "Hide full week hours")
            : String(t["hours.showWeek"] ?? "Show full week hours")
        }
        className="inline-flex max-w-full items-center gap-1.5 rounded-full hover:opacity-80"
      >
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: openNow ? "var(--accent)" : "var(--danger-ink)" }}
        />
        <span className={`truncate font-semibold ${openNow ? "text-accent" : "text-danger-ink"}`}>
          {openNow ? (t["hours.openNow"] ?? "Open now") : (t["hours.closed"] ?? "Closed")}
        </span>
        {todayRow && !expanded && todayRow.hoursText && (
          <span className="truncate text-muted">· {todayRow.hoursText}</span>
        )}
        <span aria-hidden className="shrink-0 text-muted">
          {expanded ? "▴" : "▾"}
        </span>
      </button>

      {expanded && (
        <span
          className="edge mt-2 block border-line/60 bg-surface-2/40 p-3"
          style={{ borderRadius: 12 }}
        >
          <span className="mb-2 flex items-center justify-between gap-2 border-b border-line/60 pb-2">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink">
              <span aria-hidden>🕒</span> {t["hours.title"] ?? "Hours & Service"}
            </span>
            <span
              className={`edge inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold ${openNow ? "border-transparent bg-been text-been-ink" : "border-transparent bg-danger-bg text-danger-ink"}`}
              style={{ borderRadius: 999 }}
            >
              <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
              {openNow ? (t["hours.openNow"] ?? "Open now") : (t["hours.closed"] ?? "Closed")}
            </span>
          </span>
          <span className="flex flex-col gap-1 text-xs">
            {rows.map((r) => (
              <span
                key={`${r.dayIndex}-${r.dayLabel}`}
                className={`flex items-center justify-between gap-2 py-0.5 ${
                  r.isToday ? "edge bg-surface px-2 font-bold text-ink shadow-theme" : "text-muted"
                }`}
                style={r.isToday ? { borderRadius: 8 } : undefined}
              >
                <span className="inline-flex items-center gap-1.5">
                  {r.isToday && (
                    <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                  )}
                  {r.dayLabel}
                  {r.isToday && (
                    <span className="font-semibold">({t["hours.today"] ?? "Today"})</span>
                  )}
                </span>
                <span className={`text-right font-medium ${r.isToday ? "text-accent" : ""}`}>
                  {r.hoursText || (t["hours.closed"] ?? "Closed")}
                </span>
              </span>
            ))}
          </span>
        </span>
      )}
    </span>
  );
}
