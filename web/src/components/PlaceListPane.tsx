import { useState } from "react";
import PlaceCard from "../components/PlaceCard";
import PlaceEditor from "../components/PlaceEditor";
import type { TagMutation } from "../components/TagCombobox";
import type { Place } from "../lib/api";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  places: Place[];
  loading: boolean;
  error: string | null;
  onToggleStatus: (p: Place) => void;
  onSaveEdit: (p: Place, patch: { tags: string[]; rating: number | null; note: string | null; icon: string; status?: string }) => Promise<void> | void;
  onDeleteEdit?: (p: Place) => Promise<void> | void;
  onRefresh?: (p: Place) => Promise<unknown>;
  refreshingIds?: string[];
  onError?: (msg: string) => void;
  focusedId?: string | null;
  listRef?: (el: HTMLUListElement | null) => void;
  emptyHint?: React.ReactNode;
  onCardSelect?: (id: string) => void;
  readOnly?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  onTagDefinitionsChanged?: (m: TagMutation) => void;
}

/** Journal feed of place cards with inline editing. Shared by phone list and desktop split pane. */
export default function PlaceListPane({ places, loading, error, onToggleStatus, onSaveEdit, onDeleteEdit, onRefresh, refreshingIds, onError, focusedId, listRef, emptyHint, onCardSelect, readOnly, emptyTitle, emptySubtitle, onTagDefinitionsChanged }: Props) {
  const { t } = useLanguage();
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleSave(p: Place, patch: { tags: string[]; rating: number | null; note: string | null; icon: string; status?: string }) {
    try {
      await onSaveEdit(p, patch);
      setEditingId(null);
    } catch (err: any) {
      onError?.(err?.message ?? t["editor.updateFailed"]);
      setEditingId(p.id);
    }
  }

  async function handleDelete(p: Place) {
    try {
      await onDeleteEdit?.(p);
      setEditingId(null);
    } catch (err: any) {
      onError?.(err?.message ?? t["editor.deleteFailed"]);
    }
  }

  if (loading) return <div className="py-8 text-center text-sm text-muted">{t["list.loading"]}</div>;
  if (error) {
    return <div className="edge radius-input mb-3 border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</div>;
  }
  if (!places.length) {
    return (
      <div className="edge radius-card border-line bg-surface px-4 py-10 text-center shadow-theme" style={{ borderRadius: 16 }}>
        <p className="font-display text-lg font-semibold text-ink">{emptyTitle ?? t["empty.noPlaces"]}</p>
        <p className="mt-1 text-sm text-muted">{emptySubtitle ?? t["empty.saveFirst"]}</p>
        {!readOnly && emptyHint}
      </div>
    );
  }
  return (
    <ul ref={listRef} className="flex flex-col gap-4">
      {places.map((p) => (
        <li
          key={p.id}
          data-place-id={p.id}
          onClick={(e) => {
            if (!onCardSelect) return;
            if ((e.target as HTMLElement).closest("button, a, input, textarea, select, summary, details")) return;
            onCardSelect(p.id);
          }}
          className={`edge radius-card border-line bg-surface p-4 shadow-theme transition ${focusedId === p.id ? "outline-2 outline-accent" : ""} ${editingId === p.id ? "border-accent" : ""}`}
          style={{ borderRadius: 16 }}
        >
          <PlaceCard place={p} onToggleStatus={onToggleStatus} onEdit={(pl) => { if (!readOnly) setEditingId(pl.id); }} readOnly={readOnly} onRefresh={onRefresh} refreshing={refreshingIds?.includes(p.id)} />
          {!readOnly && editingId === p.id && (
            <PlaceEditor place={p} onSave={(patch) => handleSave(p, patch)} onCancel={() => setEditingId(null)} onDelete={onDeleteEdit ? () => handleDelete(p) : undefined} onTagDefinitionsChanged={onTagDefinitionsChanged} />
          )}
        </li>
      ))}
    </ul>
  );
}
