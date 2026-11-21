import { useEffect, useRef, useState } from "react";
import type { Place } from "../../lib/api";
import PlaceCard from "../PlaceCard";

interface Props {
  place: Place;
  onClose?: () => void;
  onViewNotes?: (p: Place) => void;
  onToggleStatus?: (p: Place) => void;
  onEdit?: (p: Place) => void;
  readOnly?: boolean;
  onRefresh?: (p: Place) => Promise<unknown>;
  refreshing?: boolean;
}

/**
 * Floating preview card over the phone map.
 * Same details as list mode: shared `PlaceCard` (title, ratings,
 * status toggle, address/price, note, tags, hours, Edit/Share/refresh).
 * Tapping the body opens tasting notes; the CTA button does the same.
 * Dragging the top handle down dismisses the preview.
 */
export default function PhoneMapPreview({
  place: p,
  onClose,
  onViewNotes,
  onToggleStatus,
  onEdit,
  readOnly,
  onRefresh,
  refreshing,
}: Props) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const dragRef = useRef({ startY: 0, curY: 0, dragging: false });
  const closeTimer = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Reset drag position when the selected place changes.
  useEffect(() => {
    setDragY(0);
    setDragging(false);
    setDismissing(false);
    dragRef.current = { startY: 0, curY: 0, dragging: false };
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, [p.id]);

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  function dismiss() {
    setDismissing(true);
    setDragging(false);
    setDragY(window.innerHeight);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      onCloseRef.current?.();
    }, 200);
  }

  function onDragStart(clientY: number) {
    if (!onClose) return;
    dragRef.current = { startY: clientY, curY: clientY, dragging: true };
    setDragging(true);
  }
  function onDragMove(clientY: number) {
    if (!dragRef.current.dragging) return;
    dragRef.current.curY = clientY;
    setDragY(Math.max(0, clientY - dragRef.current.startY));
  }
  function onDragEnd() {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    setDragging(false);
    const dy = dragRef.current.curY - dragRef.current.startY;
    if (dy > 80) {
      dismiss();
    } else {
      setDragY(0);
    }
  }

  return (
    <div
      className="edge relative border-accent bg-surface p-4 shadow-theme will-change-transform"
      style={{
        borderRadius: 16,
        borderWidth: 2,
        transform: dismissing ? undefined : `translateY(${dragY}px)`,
        opacity: dismissing ? 0 : dragging ? Math.max(0.35, 1 - dragY / 500) : 1,
        transition: dragging ? "none" : "transform 220ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms",
      }}
    >
      <div
        className="cursor-grab touch-none select-none px-4 py-3 active:cursor-grabbing"
        onPointerDown={(e) => {
          try {
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          } catch {
            // ignore capture failures; drag still tracks via move/up handlers
          }
          onDragStart(e.clientY);
        }}
        onPointerMove={(e) => onDragMove(e.clientY)}
        onPointerUp={() => onDragEnd()}
        onPointerCancel={() => onDragEnd()}
        role="button"
        tabIndex={0}
        aria-label="Drag down to close preview"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose?.();
        }}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-ink/15" aria-hidden />
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-lg text-muted hover:bg-surface-2 hover:text-ink"
        >
          ×
        </button>
      )}
      <div
        onClick={(e) => {
          if (!onViewNotes) return;
          if ((e.target as HTMLElement).closest("button, a, input, textarea, select")) return;
          onViewNotes(p);
        }}
        className={onViewNotes ? "cursor-pointer" : undefined}
      >
        <PlaceCard
          place={p}
          onToggleStatus={onToggleStatus ?? (() => {})}
          onEdit={onEdit ?? (() => {})}
          readOnly={readOnly}
          onRefresh={onRefresh}
          refreshing={refreshing}
          hidePhotos
          actionStyle="pills"
        />
      </div>
      {onViewNotes && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => onViewNotes(p)}
            className="edge inline-flex min-h-[48px] w-full items-center justify-center gap-2 border-accent bg-accent px-4 text-sm font-bold text-accent-ink"
            style={{ borderRadius: 12 }}
          >
            <span aria-hidden>📝</span> View Tasting Notes
          </button>
        </div>
      )}
    </div>
  );
}
