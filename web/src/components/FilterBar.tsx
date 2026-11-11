import TagCombobox from "./TagCombobox";
import { emojiFor } from "../theme/pins";

interface Props {
  status: string;
  setStatus: (s: string) => void;
  tags: string[];
  setTags: (t: string[]) => void;
  q: string;
  setQ: (q: string) => void;
  placeType: string;
  setPlaceType: (s: string) => void;
  openEnabled: boolean;
  setOpenEnabled: (b: boolean) => void;
  openAt: string;
  setOpenAt: (s: string) => void;
  /** `stack` (default): tag picker behind a disclosure (phone top card). `rail`: tag picker always visible (desktop sidebar). */
  layout?: "stack" | "rail";
}

const TYPE_OPTIONS = ["restaurant", "bar", "café"];
const hasActive = (status: string, tags: string[], q: string, placeType: string, openEnabled: boolean) =>
  Boolean(status || tags.length || q.trim() || placeType || openEnabled);

export default function FilterBar({ status, setStatus, tags, setTags, q, setQ, placeType, setPlaceType, openEnabled, setOpenEnabled, openAt, setOpenAt, layout = "stack" }: Props) {
  const active = hasActive(status, tags, q, placeType, openEnabled);
  function clearAll() {
    setStatus("");
    setTags([]);
    setQ("");
    setPlaceType("");
    setOpenEnabled(false);
    setOpenAt("");
  }

  return (
    <section aria-label="filters" className="edge radius-card mb-4 border-line bg-surface p-3 shadow-theme sm:p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Filters</h2>
        {active && (
          <button
            type="button"
            onClick={clearAll}
            className="radius-input min-h-[36px] px-2 text-xs font-medium text-accent underline-offset-2 hover:underline"
          >
            Reset all
          </button>
        )}
      </div>

      {/* Search always full-width on its own row */}
      <input
        aria-label="text search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔍 Search name…"
        enterKeyHint="search"
        className="edge radius-input min-h-[44px] w-full border-line bg-bg px-3 py-2 text-base text-ink placeholder:text-muted sm:text-sm"
      />

      {/* Status + type side by side, roomy touch targets */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Status
          <select
            aria-label="status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="edge radius-input min-h-[44px] w-full border-line bg-bg px-2 text-sm text-ink"
          >
            <option value="">All statuses</option>
            <option value="WANT_TO_GO">○ Want to go</option>
            <option value="BEEN_TO">✓ Been to</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Type
          <select
            aria-label="type filter"
            value={placeType}
            onChange={(e) => setPlaceType(e.target.value)}
            className="edge radius-input min-h-[44px] w-full border-line bg-bg px-2 text-sm text-ink"
          >
            <option value="">🍽 All types</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{emojiFor(t)} {t}</option>
            ))}
            {placeType && !TYPE_OPTIONS.includes(placeType) && (
              <option value={placeType}>{emojiFor(placeType)} {placeType}</option>
            )}
          </select>
        </label>
      </div>

      {/* Open filter: full-width segmented control + datetime below */}
      <div className="mt-2">
        <span id="open-label" className="mb-1 block text-xs text-muted">Opening hours</span>
        <div className="edge radius-pill grid grid-cols-3 overflow-hidden border-line text-sm" role="group" aria-labelledby="open-label">
          <button
            type="button"
            onClick={() => { setOpenEnabled(false); setOpenAt(""); }}
            aria-pressed={!openEnabled}
            className={`min-h-[44px] px-2 ${!openEnabled ? "bg-accent font-medium text-accent-ink" : "bg-surface text-muted"}`}
          >
            Anytime
          </button>
          <button
            type="button"
            onClick={() => { setOpenEnabled(true); setOpenAt(""); }}
            aria-pressed={openEnabled && !openAt}
            title="Open right now"
            className={`min-h-[44px] px-2 ${openEnabled && !openAt ? "bg-accent font-medium text-accent-ink" : "bg-surface text-muted"}`}
          >
            🟢 Now
          </button>
          <button
            type="button"
            onClick={() => setOpenEnabled(true)}
            aria-pressed={openEnabled && !!openAt}
            title="Pick a date and time"
            className={`min-h-[44px] px-2 ${openEnabled && openAt ? "bg-accent font-medium text-accent-ink" : "bg-surface text-muted"}`}
          >
            🕒 At…
          </button>
        </div>
        {openEnabled && (
          <input
            type="datetime-local"
            aria-label="open at datetime (empty means now)"
            value={openAt}
            onChange={(e) => setOpenAt(e.target.value)}
            className="edge radius-input mt-2 min-h-[44px] w-full border-line bg-bg px-2 text-sm text-ink"
          />
        )}
        {openEnabled && <p className="mt-1 text-xs text-muted">{openAt ? "Showing places open then." : "Showing places open now · unknown hours hidden."}</p>}
      </div>

      {(placeType || openEnabled || tags.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          {placeType && (
            <span className="edge radius-pill inline-flex min-h-[32px] items-center gap-1.5 border-line bg-surface-2 px-2.5 py-1 text-ink">
              {emojiFor(placeType)} {placeType}
              <button type="button" aria-label="clear type filter" onClick={() => setPlaceType("")} className="inline-flex min-h-[28px] min-w-[28px] items-center justify-center">×</button>
            </span>
          )}
          {openEnabled && (
            <span className="edge radius-pill inline-flex min-h-[32px] items-center gap-1.5 border-line bg-surface-2 px-2.5 py-1 text-ink">
              🟢 {openAt ? new Date(openAt).toLocaleString() : "open now"}
              <button type="button" aria-label="clear open filter" onClick={() => { setOpenEnabled(false); setOpenAt(""); }} className="inline-flex min-h-[28px] min-w-[28px] items-center justify-center">×</button>
            </span>
          )}
          {tags.map((t) => (
            <span key={t} className="edge radius-pill inline-flex min-h-[32px] items-center gap-1.5 border-accent bg-accent px-2.5 py-1 text-accent-ink">
              #{t}
              <button type="button" aria-label={`remove filter ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))} className="inline-flex min-h-[28px] min-w-[28px] items-center justify-center">×</button>
            </span>
          ))}
        </div>
      )}
      <details className="mt-2 text-sm" open={layout === "rail" ? true : undefined}>
        <summary className={layout === "rail" ? "mb-1 block text-xs font-medium uppercase tracking-wide text-muted [&::-webkit-details-marker]:hidden" : "inline-flex min-h-[40px] cursor-pointer items-center text-muted"}>{layout === "rail" ? "Tags" : "Filter by tags"}</summary>
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
    </section>
  );
}
