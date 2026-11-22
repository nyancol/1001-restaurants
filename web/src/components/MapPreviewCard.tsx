import { useEffect, useRef, useState } from "react";
import type { Place } from "../lib/api";
import PlaceCard from "./PlaceCard";
import PlaceEditor from "./PlaceEditor";
import type { TagMutation } from "./TagCombobox";

interface Props {
  place: Place;
  onViewNotes: (p: Place) => void;
  onClose?: () => void;
  onToggleStatus: (p: Place) => void;
  onSaveEdit: (p: Place, patch: { tags: string[]; rating: number | null; note: string | null; icon: string; status?: string }) => Promise<void>;
  onDelete?: (p: Place) => Promise<void> | void;
  onRefresh?: (p: Place) => Promise<unknown>;
  refreshing?: boolean;
  readOnly?: boolean;
  onTagDefinitionsChanged?: (m: TagMutation) => void;
}

/**
 * Pin-selected preview docked on top of the map.
 * Same details as list mode: shared `PlaceCard` (title, ratings,
 * status toggle, address/price, note, tags, hours, actions) with the
 * inline `PlaceEditor`, plus a top handle that drags down to close.
 */
export default function MapPreviewCard({
  place: p,
  onViewNotes,
  onClose,
  onToggleStatus,
  onSaveEdit,
  onDelete,
  onRefresh,
  refreshing,
  readOnly,
  onTagDefinitionsChanged,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const dragRef = useRef({ startY: 0, curY: 0, dragging: false });
  const closeTimer = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Reset when another pin is selected.
  useEffect(() => {
    setEditing(false);
    setSaveError(null);
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

  async function handleSave(patch: { tags: string[]; rating: number | null; note: string | null; icon: string; status?: string }) {
    setSaveError(null);
    try {
      await onSaveEdit(p, patch);
    } catch (err: any) {
      setSaveError(err?.message ?? "Update failed — please try again.");
      return;
    }
    setEditing(false);
    onCloseRef.current?.();
  }

  return (
    <div
      className="edge radius-card relative border-line bg-surface p-3 shadow-theme will-change-transform"
      style={{
        borderRadius: 16,
        transform: `translateY(${dragY}px)`,
        opacity: dismissing ? 0 : dragging ? Math.max(0.35, 1 - dragY / 500) : 1,
        transition: dragging ? "none" : "transform 220ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms",
      }}
    >
      <div
        className="-mx-3 -mt-3 cursor-grab touch-none select-none px-3 py-3 active:cursor-grabbing"
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
        <div className="mx-auto h-1.5 w-12 rounded-full bg-ink/25" aria-hidden />
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
      <PlaceCard
        place={p}
        onToggleStatus={onToggleStatus}
        onEdit={() => {
          if (!readOnly) setEditing(true);
        }}
        readOnly={readOnly}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
      {!readOnly && editing && (
        <>
          {saveError && (
            <div className="edge radius-input mt-2 border-danger-line bg-danger-bg px-2 py-1 text-xs text-danger-ink" role="alert">
              {saveError}
            </div>
          )}
          <PlaceEditor
            place={p}
            onSave={(patch) => void handleSave(patch)}
            onCancel={() => setEditing(false)}
            onDelete={onDelete ? () => onDelete(p) : undefined}
            onTagDefinitionsChanged={onTagDefinitionsChanged}
          />
        </>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => onViewNotes(p)}
          className="edge ml-auto inline-flex min-h-[40px] items-center border-accent bg-accent px-4 text-[13px] font-semibold text-accent-ink"
          style={{ borderRadius: 999 }}
        >
          View Tasting Notes
        </button>
      </div>
    </div>
  );
}
