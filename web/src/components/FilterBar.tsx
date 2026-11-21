import { useEffect, useState } from "react";
import TagCombobox from "./TagCombobox";
import TagDot from "./TagDot";
import { colorForDisplay, useTagColors } from "../lib/useTagColors";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  status: string;
  setStatus: (s: string) => void;
  tags: string[];
  setTags: (t: string[]) => void;
  q: string;
  setQ: (q: string) => void;
  openEnabled: boolean;
  setOpenEnabled: (b: boolean) => void;
  openAt: string;
  setOpenAt: (s: string) => void;
  /** `stack` (default): tag picker behind a disclosure (phone top card). `rail`: tag picker always visible (desktop sidebar). */
  layout?: "stack" | "rail";
  statusCounts?: { all: number; want: number; been: number };
}

// ---------------------------------------------------------------------------
// Opening-hours helpers: `openAt` is a `datetime-local` string
// (`YYYY-MM-DDTHH:mm`) for URL compatibility; the server also accepts ISO.
// We split it into separate date + time parts so we can render two native
// pickers (far more intuitive on mobile than a single datetime-local).
// ---------------------------------------------------------------------------
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toLocalYMD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toLocalHM(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function addDaysYMD(ymd: string, days: number): string {
  const [y, m, day] = ymd.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  d.setDate(d.getDate() + days);
  return toLocalYMD(d);
}

/** Split any accepted `openAt` value into local date + time parts. */
function splitOpenAt(openAt: string): { date: string; time: string } {
  if (!openAt) return { date: "", time: "" };
  // Fast path: plain datetime-local.
  const m = openAt.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (m) return { date: m[1], time: m[2] };
  const d = new Date(openAt);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  return { date: toLocalYMD(d), time: toLocalHM(d) };
}

/** `true` for a strict 24h `HH:MM` value (`00:00`–`23:59`). */
function isValid24h(t: string): boolean {
  const m = t.match(/^(\d{2}):(\d{2})$/);
  if (!m) return false;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h >= 0 && h <= 23 && min >= 0 && min <= 59;
}

/**
 * Tolerant parse of what the user typed: accepts `19:30`, `9:30` and bare
 * digits (`1930` → `19:30`, `930` → `09:30`). Returns `null` when invalid.
 */
function normalizeTimeDraft(raw: string): string | null {
  const s = raw.trim();
  const m = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (m) {
    const v = `${pad2(Number(m[1]))}:${pad2(Number(m[2]))}`;
    return isValid24h(v) ? v : null;
  }
  const digits = s.replace(/\D/g, "");
  if (digits.length === 3 || digits.length === 4) {
    const v = `${digits.slice(0, -2).padStart(2, "0")}:${digits.slice(-2)}`;
    return isValid24h(v) ? v : null;
  }
  return null;
}

/** Default "at" value: next rounded hour, so picking "Choose…" shows something sane. */
function defaultOpenAt(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return `${toLocalYMD(d)}T${toLocalHM(d)}`;
}

export function formatOpenAt(openAt: string, locale?: string): string {
  const d = new Date(openAt);
  if (Number.isNaN(d.getTime())) return openAt;
  const loc = locale ?? (typeof document !== "undefined" ? document.documentElement.lang || undefined : undefined);
  return new Intl.DateTimeFormat(loc, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function dayLabel(dateStr: string, todayLabel: string, tomorrowLabel: string, locale?: string): string {
  const today = toLocalYMD(new Date());
  if (dateStr === today) return todayLabel;
  if (dateStr === addDaysYMD(today, 1)) return tomorrowLabel;
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  const loc = locale ?? (typeof document !== "undefined" ? document.documentElement.lang || undefined : undefined);
  return new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "short" }).format(d);
}

const hasActive = (status: string, tags: string[], q: string, openEnabled: boolean) =>
  Boolean(status || tags.length || q.trim() || openEnabled);

export default function FilterBar({ status, setStatus, tags, setTags, q, setQ, openEnabled, setOpenEnabled, openAt, setOpenAt, layout = "stack", statusCounts }: Props) {
  const { t, locale } = useLanguage();
  const tagColors = useTagColors();
  const active = hasActive(status, tags, q, openEnabled);
  function clearAll() {
    setStatus("");
    setTags([]);
    setQ("");
    setOpenEnabled(false);
    setOpenAt("");
  }
  const openMode = !openEnabled ? "any" : openAt ? "at" : "now";
  const { date: openDate, time: openTime } = splitOpenAt(openAt);
  // Free-typed 24h "HH:MM" field (a select of every combination is unwieldy,
  // and native time inputs render AM/PM in some locales and can't be forced
  // to 24h). The draft holds in-progress typing; valid entries commit live.
  const [timeDraft, setTimeDraft] = useState(openTime || "20:00");
  useEffect(() => {
    if (openTime) setTimeDraft(openTime);
  }, [openTime]);
  const timeValid = isValid24h(timeDraft.trim());
  const showTimeError =
    timeDraft.trim().length > 0 && !timeValid && (/[a-zA-Z]/.test(timeDraft) || /^(\d{1,2}:\d{2}|\d{3,4})$/.test(timeDraft.trim()));
  const todayYMD = toLocalYMD(new Date());
  const tomorrowYMD = addDaysYMD(todayYMD, 1);
  // One-tap restaurant presets: tonight / tomorrow lunch / tomorrow dinner.
  const tonightAt = `${todayYMD}T20:00`;
  const tomorrowLunchAt = `${tomorrowYMD}T12:30`;
  const tomorrowDinnerAt = `${tomorrowYMD}T20:00`;
  const tonightPast = new Date(tonightAt).getTime() < Date.now();

  function pickAnytime() {
    setOpenEnabled(false);
    setOpenAt("");
  }
  function pickNow() {
    setOpenEnabled(true);
    setOpenAt("");
  }
  function pickAt() {
    setOpenEnabled(true);
    if (!openAt) setOpenAt(defaultOpenAt());
  }
  function setAt(date: string, time: string) {
    if (!date || !time) return;
    setOpenEnabled(true);
    setOpenAt(`${date}T${time}`);
  }

  const isRail = layout === "rail";
  const counts = statusCounts ?? { all: 0, want: 0, been: 0 };

  return (
    <section aria-label={t["filter.aria"]} className={isRail ? "flex flex-col gap-5" : "edge radius-card mb-4 border-line bg-surface p-3 shadow-theme sm:p-3"} style={isRail ? undefined : { borderRadius: 16 }}>
      {isRail ? (
        <>
          {/* Search */}
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">⌕</span>
            <input
              aria-label={t["filter.searchAria"]}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Dishes, spots, arrondissements..."
              enterKeyHint="search"
              className="edge w-full border-line bg-surface py-2.5 pl-9 pr-12 text-sm text-ink placeholder:text-muted"
              style={{ borderRadius: 999, minHeight: 44 }}
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-muted" style={{ borderRadius: 6 }}>⌘K</kbd>
          </div>

          {/* Lists & State */}
          <div>
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Lists &amp; State</h2>
          <div className="flex flex-col gap-1.5">
              {[
                { key: "", label: "All Saved Tables", icon: "🍴", count: counts.all, active: status === "" },
                { key: "WANT_TO_GO", label: "Want to Visit", icon: "🔖", count: counts.want, active: status === "WANT_TO_GO" },
                { key: "BEEN_TO", label: "Been & Loved", icon: "✓", count: counts.been, active: status === "BEEN_TO" },
              ].map((row) => (
                <button
                  key={row.label}
                  type="button"
                  onClick={() => setStatus(row.key)}
                  aria-pressed={row.active}
                  className={`edge flex min-h-[44px] items-center gap-2.5 px-3 text-sm font-semibold ${row.active ? "border-accent bg-accent text-accent-ink shadow-theme" : "border-transparent bg-transparent text-ink hover:bg-surface"}`}
                  style={{ borderRadius: 12 }}
                >
                  <span aria-hidden>{row.icon}</span>
                  <span className="flex-1 text-left">{row.label}</span>
                  <span className={`inline-flex min-h-[22px] min-w-[26px] items-center justify-center px-1.5 text-[11px] font-bold ${row.active ? "bg-white/25 text-accent-ink" : "bg-surface-2 text-muted"}`} style={{ borderRadius: 999 }}>{row.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Tags</h2>
              <span className="text-[11px] text-muted">12 tags</span>
            </div>
            <TagCombobox value={tags} onChange={(next) => setTags(next)} allowCreate={false} showSelected={false} variant="filter-list" />
            {(active || true) && (
              <button type="button" onClick={clearAll} className="mt-3 block w-full text-center text-xs text-muted underline underline-offset-4 hover:text-ink">
                Reset all journal filters
              </button>
            )}
          </div>

          {/* Open filter compact */}
          <details className="text-sm">
            <summary className="inline-flex min-h-[36px] cursor-pointer items-center text-xs font-semibold uppercase tracking-wide text-muted">{t["filter.openingHours"]}</summary>
            <div className="mt-1">
              <div className="edge grid grid-cols-3 overflow-hidden border-line text-xs" style={{ borderRadius: 999 }} role="group" aria-labelledby="open-label">
                <button type="button" onClick={pickAnytime} aria-pressed={openMode === "any"} className={`min-h-[40px] px-2 ${openMode === "any" ? "bg-accent font-semibold text-accent-ink" : "bg-surface text-muted"}`}>{t["filter.anytime"]}</button>
                <button type="button" onClick={pickNow} aria-pressed={openMode === "now"} className={`min-h-[40px] px-2 ${openMode === "now" ? "bg-accent font-semibold text-accent-ink" : "bg-surface text-muted"}`}>{t["filter.now"]}</button>
                <button type="button" onClick={pickAt} aria-pressed={openMode === "at"} className={`min-h-[40px] px-2 ${openMode === "at" ? "bg-accent font-semibold text-accent-ink" : "bg-surface text-muted"}`}>{t["filter.choose"]}</button>
              </div>
              {(openAt || tags.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {tags.map((tg) => (
                    <span key={tg} className="edge inline-flex min-h-[32px] items-center gap-1.5 border-accent bg-accent px-2.5 py-1 text-accent-ink" style={{ borderRadius: 999 }}>
                      <TagDot color={colorForDisplay(tg, tagColors)} />
                      #{tg}
                      <button type="button" aria-label={t["filter.removeFilter"](tg)} onClick={() => setTags(tags.filter((x) => x !== tg))} className="inline-flex min-h-[28px] min-w-[28px] items-center justify-center">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </details>
        </>
      ) : (
        <>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">{t["filter.title"]}</h2>
        {active && (
          <button
            type="button"
            onClick={clearAll}
            className="radius-input min-h-[36px] px-2 text-xs font-medium text-accent underline-offset-2 hover:underline"
          >
            {t["filter.resetAll"]}
          </button>
        )}
      </div>

      {/* Search always full-width on its own row */}
      <input
        aria-label={t["filter.searchAria"]}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t["filter.searchPlaceholder"]}
        enterKeyHint="search"
        className="edge radius-input min-h-[44px] w-full border-line bg-bg px-3 py-2 text-base text-ink placeholder:text-muted sm:text-sm"
      />

      {/* Status full-width */}
      <div className="mt-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t["filter.status"]}
          <select
            aria-label={t["filter.statusAria"]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="edge radius-input min-h-[44px] w-full border-line bg-bg px-2 text-sm text-ink"
          >
            <option value="">{t["filter.allStatuses"]}</option>
            <option value="WANT_TO_GO">{t["filter.wantToGo"]}</option>
            <option value="BEEN_TO">{t["filter.beenTo"]}</option>
          </select>
        </label>
      </div>
        </>
      )}

      {!isRail && (
        <>
      {/* Open filter: Anytime / Now / pick a moment with presets + separate date/time */}
      <fieldset className="mt-2 min-w-0 border-0 p-0">
        <legend id="open-label" className="mb-1 block text-xs text-muted">{t["filter.openingHours"]}</legend>
        <div className="edge radius-pill grid grid-cols-3 overflow-hidden border-line text-sm" role="group" aria-labelledby="open-label">
          <button
            type="button"
            onClick={pickAnytime}
            aria-pressed={openMode === "any"}
            className={`min-h-[44px] px-2 ${openMode === "any" ? "bg-accent font-medium text-accent-ink" : "bg-surface text-muted"}`}
          >
            {t["filter.anytime"]}
          </button>
          <button
            type="button"
            onClick={pickNow}
            aria-pressed={openMode === "now"}
            title={t["filter.nowTitle"]}
            className={`min-h-[44px] px-2 ${openMode === "now" ? "bg-accent font-medium text-accent-ink" : "bg-surface text-muted"}`}
          >
            {t["filter.now"]}
          </button>
          <button
            type="button"
            onClick={pickAt}
            aria-pressed={openMode === "at"}
            title={t["filter.chooseTitle"]}
            className={`min-h-[44px] px-2 ${openMode === "at" ? "bg-accent font-medium text-accent-ink" : "bg-surface text-muted"}`}
          >
            {t["filter.choose"]}
          </button>
        </div>
        {openMode === "now" && <p className="mt-1 text-xs text-muted">{t["filter.openNowNote"]}</p>}
        {openMode === "at" && (
          <div className="edge radius-input mt-2 border-line bg-bg p-2">
            {/* One-tap presets cover the common restaurant case */}
            <p className="text-xs text-muted">{t["filter.quickPicks"]}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {[
                { label: t["filter.tonight"], value: tonightAt, disabled: tonightPast, title: tonightPast ? t["filter.tonightPastTitle"] : t["filter.tonightTitle"] },
                { label: t["filter.tomorrowLunch"], value: tomorrowLunchAt, disabled: false, title: t["filter.tomorrowLunchTitle"] },
                { label: t["filter.tomorrowDinner"], value: tomorrowDinnerAt, disabled: false, title: t["filter.tomorrowDinnerTitle"] },
              ].map((p) => {
                const selected = openAt === p.value;
                return (
                  <button
                    key={p.label}
                    type="button"
                    disabled={p.disabled}
                    title={p.title}
                    onClick={() => { setOpenEnabled(true); setOpenAt(p.value); }}
                    aria-pressed={selected}
                    className={`radius-pill min-h-[36px] px-2.5 text-xs ${selected ? "bg-accent font-medium text-accent-ink" : "edge border-line bg-surface text-ink"} ${p.disabled ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Day + time selectors */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs text-muted">
                {t["filter.day"]}
                <input
                  type="date"
                  aria-label={t["filter.dayAria"]}
                  value={openDate}
                  min={todayYMD}
                  onChange={(e) => { if (e.target.value) setAt(e.target.value, openTime || "20:00"); }}
                  className="edge radius-input min-h-[44px] w-full border-line bg-surface px-2 text-sm text-ink"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                {t["filter.hour"]}
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={t["filter.hourPlaceholder"]}
                  maxLength={5}
                  aria-label={t["filter.hourAria"]}
                  aria-invalid={!timeValid}
                  value={timeDraft}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setTimeDraft(raw);
                    const v = normalizeTimeDraft(raw);
                    if (v) setAt(openDate || todayYMD, v);
                  }}
                  onBlur={() => {
                    const v = normalizeTimeDraft(timeDraft);
                    if (v) {
                      setTimeDraft(v);
                      setAt(openDate || todayYMD, v);
                    } else {
                      setTimeDraft(openTime || "20:00");
                    }
                  }}
                  className={`edge radius-input min-h-[44px] w-full border-line bg-surface px-2 text-sm text-ink ${showTimeError ? "border-danger-line" : ""}`}
                />
              </label>
            </div>
            {showTimeError && <p className="mt-1 text-xs text-danger-ink">{t["filter.timeError"]}</p>}

            <p className="mt-2 text-sm text-ink" aria-live="polite">
              {t["filter.openPrefix"]} {openAt ? `${dayLabel(openDate, t["filter.today"], t["filter.tomorrow"], locale)} ${openTime}` : t["filter.ellipsis"]} <span className="text-xs text-muted">({openAt ? formatOpenAt(openAt, locale) : ""})</span>
            </p>
            <p className="mt-0.5 text-xs text-muted">{t["filter.unknownHidden"]}</p>
          </div>
        )}
      </fieldset>

      {(openAt || tags.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          {openAt && (
            <span className="edge radius-pill inline-flex min-h-[32px] items-center gap-1.5 border-line bg-surface-2 px-2.5 py-1 text-ink">
              🟢 {formatOpenAt(openAt, locale)}
              <button type="button" aria-label={t["filter.clearOpen"]} onClick={() => { setOpenEnabled(false); setOpenAt(""); }} className="inline-flex min-h-[28px] min-w-[28px] items-center justify-center">×</button>
            </span>
          )}
          {tags.map((tg) => (
            <span key={tg} className="edge radius-pill inline-flex min-h-[32px] items-center gap-1.5 border-accent bg-accent px-2.5 py-1 text-accent-ink">
              <TagDot color={colorForDisplay(tg, tagColors)} />
              #{tg}
              <button type="button" aria-label={t["filter.removeFilter"](tg)} onClick={() => setTags(tags.filter((x) => x !== tg))} className="inline-flex min-h-[28px] min-w-[28px] items-center justify-center">×</button>
            </span>
          ))}
        </div>
      )}
      <details className="mt-2 text-sm" open={layout === "rail" ? true : undefined}>
        <summary className={layout === "rail" ? "mb-1 block text-xs font-medium uppercase tracking-wide text-muted [&::-webkit-details-marker]:hidden" : "inline-flex min-h-[40px] cursor-pointer items-center text-muted"}>{layout === "rail" ? t["filter.tags"] : t["filter.filterByTags"]}</summary>
        <div className="mt-1">
          <TagCombobox
            value={tags}
            onChange={(next) => {
              setTags(next);
            }}
            allowCreate={false}
            showSelected={false}
            variant="filter-list"
          />
        </div>
      </details>
        </>
      )}
    </section>
  );
}
