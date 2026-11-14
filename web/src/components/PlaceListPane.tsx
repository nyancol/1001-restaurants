import { useState } from "react";
import PlaceCard from "../components/PlaceCard";
import PlaceEditor from "../components/PlaceEditor";
import type { Place } from "../lib/api";

interface Props {
  places: Place[];
  loading: boolean;
  error: string | null;
  onToggleStatus: (p: Place) => void;
  onSaveEdit: (p: Place, patch: { tags: string[]; rating: number | null; note: string | null; placeType: string }) => Promise<void> | void;
  onRefresh?: (p: Place) => Promise<unknown>;
  refreshingIds?: string[];
  onError?: (msg: string) => void;
  focusedId?: string | null;
  listRef?: (el: HTMLUListElement | null) => void;
  emptyHint?: React.ReactNode;
  /** Called when a card (outside its buttons/inputs) is tapped — split view uses it to highlight the pin. */
  onCardSelect?: (id: string) => void;
  readOnly?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
}

/** Scrollable list of place cards with inline editing. Shared by phone list and desktop split pane. */
export default function PlaceListPane({ places, loading, error, onToggleStatus, onSaveEdit, onRefresh, refreshingIds, onError, focusedId, listRef, emptyHint, onCardSelect, readOnly, emptyTitle, emptySubtitle }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleSave(p: Place, patch: { tags: string[]; rating: number | null; note: string | null; placeType: string }) {
    try {
      await onSaveEdit(p, patch);
      setEditingId(null);
    } catch (err: any) {
      onError?.(err?.message ?? "Update failed — rolled back.");
      setEditingId(p.id);
    }
  }

  if (loading) return <div className="py-8 text-center text-sm text-muted">Loading…</div>;
  if (error) {
    return <div className="edge radius-input mb-3 border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</div>;
  }
  if (!places.length) {
    return (
      <div className="edge radius-card border-dashed border-line bg-surface px-4 py-10 text-center">
        <p className="font-display font-medium text-ink">{emptyTitle ?? "No places yet"}</p>
        <p className="mt-1 text-sm text-muted">{emptySubtitle ?? "Save your first spot from the Add page."}</p>
        {!readOnly && emptyHint}
      </div>
    );
  }
  return (
    <ul ref={listRef} className="flex flex-col gap-3">
      {places.map((p) => (
        <li
          key={p.id}
          data-place-id={p.id}
          onClick={(e) => {
            if (!onCardSelect) return;
            if ((e.target as HTMLElement).closest("button, a, input, textarea, select, summary, details")) return;
            onCardSelect(p.id);
          }}
          className={`edge radius-card border-line bg-surface p-3 shadow-theme ${focusedId === p.id ? "outline-2 outline-accent" : ""}`}
        >
          <PlaceCard place={p} onToggleStatus={onToggleStatus} onEdit={(pl) => { if (!readOnly) setEditingId(pl.id); }} readOnly={readOnly} onRefresh={onRefresh} refreshing={refreshingIds?.includes(p.id)} />
          {!readOnly && editingId === p.id && (
            <PlaceEditor place={p} onSave={(patch) => handleSave(p, patch)} onCancel={() => setEditingId(null)} />
          )}
        </li>
      ))}
    </ul>
  );
}
