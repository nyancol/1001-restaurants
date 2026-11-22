import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  tags: string[];
  setTags: (t: string[]) => void;
  openEnabled: boolean;
  setOpenEnabled: (b: boolean) => void;
  openAt: string;
  setOpenAt: (s: string) => void;
  price: string;
  setPrice: (s: string) => void;
  status: string;
  setStatus: (s: string) => void;
  counts: { all: number; want: number; been: number };
  resultCount: number;
}

const PRICE_TIERS = ["$", "$$", "$$$", "$$$$"] as const;

function parsePriceMulti(price: string): string[] {
  if (!price) return [];
  return price.split(",").map((s) => s.trim()).filter(Boolean);
}

function priceSummary(prices: string[]): string {
  if (prices.length === 0) return "Any";
  const labels: Record<string, string> = { $: "Budget", $$: "Moderate", $$$: "Upscale", $$$$: "Luxury" };
  if (prices.length === 1) return labels[prices[0]] ?? "Filtered";
  return "Filtered";
}

function tonightISO(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `${ymd}T20:00`;
}

/**
 * Phone bottom-sheet from Stitch "Places mobile - filter selection".
 * Slide-up open animation + drag handle to dismiss.
 */
export default function FilterSheet({
  open,
  onClose,
  tags,
  setTags,
  openEnabled,
  setOpenEnabled,
  openAt,
  setOpenAt,
  price,
  setPrice,
  status,
  setStatus,
  counts,
  resultCount,
}: Props) {
  const [tagDraft, setTagDraft] = useState("");
  const [openTab, setOpenTab] = useState<"now" | "ahead">(!openEnabled ? "now" : openAt ? "ahead" : "now");
  const prices = parsePriceMulti(price);

  // Mount animation state: keep rendered during exit transition.
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startY: number; curY: number; dragging: boolean }>({ startY: 0, curY: 0, dragging: false });
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
      setMounted(true);
      setDragY(0);
      setOpenTab(!openEnabled ? "now" : openAt ? "ahead" : "now");
      let openCancelled = false;
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!openCancelled) setShown(true);
        });
      });
      document.body.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onCloseRef.current();
      };
      document.addEventListener("keydown", onKey);
      return () => {
        openCancelled = true;
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
      };
    } else if (mounted) {
      // Start exit transition, unmount after it finishes.
      setShown(false);
      setDragY(0);
      setDragging(false);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => setMounted(false), 340);
      document.body.style.overflow = "";
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => {
    document.body.style.overflow = "";
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  function togglePrice(tier: string) {
    const next = prices.includes(tier) ? prices.filter((x) => x !== tier) : [...prices, tier];
    setPrice(next.join(","));
  }

  function addTag(raw: string) {
    const v = raw.trim().replace(/^#/, "");
    if (!v || tags.includes(v)) return;
    setTags([...tags, v]);
    setTagDraft("");
  }

  function clearAll() {
    setTags([]);
    setOpenEnabled(false);
    setOpenAt("");
    setPrice("");
    setStatus("");
  }

  // --- Drag-to-close from the top handle ---
  function onDragStart(clientY: number) {
    dragRef.current = { startY: clientY, curY: clientY, dragging: true };
    setDragging(true);
  }
  function onDragMove(clientY: number) {
    if (!dragRef.current.dragging) return;
    dragRef.current.curY = clientY;
    const dy = Math.max(0, clientY - dragRef.current.startY);
    setDragY(dy);
  }
  function onDragEnd() {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    setDragging(false);
    const dy = dragRef.current.curY - dragRef.current.startY;
    if (dy > 110) {
      // Fling down: animate out then close.
      setShown(false);
      setDragY(window.innerHeight);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => {
        onCloseRef.current();
      }, 220);
    } else {
      // Snap back.
      setDragY(0);
    }
  }

  if (!mounted) return null;

  const activeCount = tags.length + (openEnabled ? 1 : 0) + prices.length + (status ? 1 : 0);
  const sheetTransform = dragging ? `translateY(${dragY}px)` : shown ? `translateY(${dragY}px)` : `translateY(100%)`;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 transition-opacity duration-300"
        style={{ opacity: shown && !dragging ? 1 : dragging ? Math.max(0, 1 - dragY / 500) : 0 }}
      />
      <div
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden bg-[#fff8e8] shadow-theme will-change-transform"
        style={{
          borderRadius: "24px 24px 0 0",
          transform: sheetTransform,
          transition: dragging ? "none" : "transform 340ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* Drag handle zone */}
        <div
          className="cursor-grab touch-none select-none pt-2 active:cursor-grabbing"
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            onDragStart(e.clientY);
          }}
          onPointerMove={(e) => onDragMove(e.clientY)}
          onPointerUp={() => onDragEnd()}
          onPointerCancel={() => onDragEnd()}
          aria-label="Drag down to close filters"
          role="button"
          tabIndex={0}
        >
          <div className="mx-auto h-1.5 w-12 rounded-full bg-ink/25" aria-hidden />
          <div className="py-1 text-center text-[11px] font-medium text-muted/70" aria-hidden>
            Drag down to close
          </div>
        </div>
        <div className="flex items-center justify-between px-4 pb-1 pt-1">
          <button type="button" onClick={onClose} aria-label="Close filters" className="inline-flex h-10 w-10 items-center justify-center text-xl text-ink">
            ×
          </button>
          <h2 className="font-display text-xl font-bold text-ink">Filters</h2>
          <button type="button" onClick={clearAll} className="min-h-[40px] px-2 text-sm font-semibold text-accent">
            Clear all
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ overscrollBehavior: "contain" }}>
          {/* Tags & vibe */}
          <div className="border-t border-line/60 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">Tags &amp; vibe</h3>
              {activeCount > 0 && <span className="text-xs font-semibold text-accent">{activeCount} active</span>}
            </div>
            <label
              className="edge flex min-h-[48px] items-center gap-2 border-line bg-surface px-3"
              style={{ borderRadius: 12 }}
            >
              <span aria-hidden className="text-muted">⌕</span>
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTag(tagDraft);
                }}
                placeholder="Search or add tags..."
                aria-label="Search or add tags"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />
              <span className="text-xs text-muted">Enter ⏎</span>
            </label>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tg) => (
                  <span
                    key={tg}
                    className="edge inline-flex min-h-[40px] items-center gap-2 border-accent bg-accent px-3.5 text-sm font-semibold text-accent-ink"
                    style={{ borderRadius: 999 }}
                  >
                    {tg}
                    <button
                      type="button"
                      aria-label={`Remove ${tg} filter`}
                      onClick={() => setTags(tags.filter((x) => x !== tg))}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-base leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Opening hours */}
          <div className="mt-6">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink">Opening hours &amp; timing</h3>
            <div className="edge grid grid-cols-2 gap-1 border-line bg-surface-2/60 p-1" style={{ borderRadius: 12 }} role="group" aria-label="Opening hours">
              <button
                type="button"
                aria-pressed={openTab === "now"}
                onClick={() => {
                  setOpenTab("now");
                  setOpenEnabled(true);
                  setOpenAt("");
                }}
                className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 px-2 text-sm font-semibold ${
                  openTab === "now" && openEnabled ? "bg-surface text-accent shadow-theme" : "text-muted"
                }`}
                style={{ borderRadius: 9 }}
              >
                <span aria-hidden className="text-accent">●</span> Open Now
              </button>
              <button
                type="button"
                aria-pressed={openTab === "ahead"}
                onClick={() => {
                  setOpenTab("ahead");
                  setOpenEnabled(true);
                  if (!openAt) setOpenAt(tonightISO());
                }}
                className={`inline-flex min-h-[44px] items-center justify-center px-2 text-sm font-semibold ${
                  openTab === "ahead" ? "bg-surface text-ink shadow-theme" : "text-muted"
                }`}
                style={{ borderRadius: 9 }}
              >
                Plan Ahead
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpenTab("ahead");
                  setOpenEnabled(true);
                  setOpenAt(tonightISO());
                }}
                className="edge border-line bg-surface p-3 text-left"
                style={{ borderRadius: 12 }}
              >
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Date</span>
                <span className="mt-0.5 flex items-center justify-between text-sm font-bold text-ink">
                  Tonight,{" "}
                  {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
                  <span aria-hidden>📅</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenTab("ahead");
                  setOpenEnabled(true);
                  setOpenAt(tonightISO());
                }}
                className="edge border-line bg-surface p-3 text-left"
                style={{ borderRadius: 12 }}
              >
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Service</span>
                <span className="mt-0.5 flex items-center justify-between text-sm font-bold text-ink">
                  Dinner ({openAt ? new Date(openAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "8:00 PM"}) <span aria-hidden>🕐</span>
                </span>
              </button>
            </div>
          </div>

          {/* Price */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">Price level</h3>
              <span className="text-xs text-muted">{priceSummary(prices)}</span>
            </div>
            <div className="edge grid grid-cols-4 gap-1 border-line bg-surface-2/60 p-1" style={{ borderRadius: 12 }} role="group" aria-label="Price level">
              {PRICE_TIERS.map((tier) => {
                const active = prices.includes(tier);
                return (
                  <button
                    key={tier}
                    type="button"
                    aria-pressed={active}
                    onClick={() => togglePrice(tier)}
                    className={`inline-flex min-h-[44px] items-center justify-center text-sm font-bold ${
                      active ? "bg-accent text-accent-ink shadow-theme" : "text-muted"
                    }`}
                    style={{ borderRadius: 9 }}
                  >
                    {tier}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lists & status */}
          <div className="mt-6">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink">Lists &amp; status</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={status === ""}
                onClick={() => setStatus("")}
                className={`edge inline-flex min-h-[48px] items-center gap-2 border-line px-4 text-sm font-semibold ${
                  status === "" ? "border-accent bg-accent text-accent-ink" : "bg-surface text-ink"
                }`}
                style={{ borderRadius: 12 }}
              >
                {status === "" && <span aria-hidden>✓</span>} All Saved Tables ({counts.all})
              </button>
              <button
                type="button"
                aria-pressed={status === "WANT_TO_GO"}
                onClick={() => setStatus(status === "WANT_TO_GO" ? "" : "WANT_TO_GO")}
                className={`edge inline-flex min-h-[48px] items-center gap-2 border-line px-4 text-sm font-semibold ${
                  status === "WANT_TO_GO" ? "border-accent bg-accent text-accent-ink" : "bg-surface text-ink"
                }`}
                style={{ borderRadius: 12 }}
              >
                <span aria-hidden>🔖</span> Want to Visit ({counts.want})
              </button>
              <button
                type="button"
                aria-pressed={status === "BEEN_TO"}
                onClick={() => setStatus(status === "BEEN_TO" ? "" : "BEEN_TO")}
                className={`edge inline-flex min-h-[48px] items-center gap-2 border-line px-4 text-sm font-semibold ${
                  status === "BEEN_TO" ? "border-accent bg-accent text-accent-ink" : "bg-surface text-ink"
                }`}
                style={{ borderRadius: 12 }}
              >
                <span aria-hidden>✓</span> Been &amp; Loved ({counts.been})
              </button>
            </div>
          </div>
          <div className="h-2" />
        </div>

        <div className="border-t border-line/60 bg-[#fff8e8] p-4">
          <button
            type="button"
            onClick={onClose}
            className="edge inline-flex min-h-[52px] w-full items-center justify-center gap-2 border-accent bg-accent text-base font-bold text-accent-ink"
            style={{ borderRadius: 12 }}
          >
            Show {resultCount} {resultCount === 1 ? "place" : "places"}
          </button>
        </div>
      </div>
    </div>
  );
}
