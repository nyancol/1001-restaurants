import { useState } from "react";
import type { Place } from "../lib/api";
import TagCombobox from "./TagCombobox";
import TypeCombobox from "./TypeCombobox";
import Stars from "./Stars";
import ConfirmDialog from "./ConfirmDialog";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  place: Place;
  onSave: (patch: { tags: string[]; rating: number | null; note: string | null; placeType: string }) => void;
  onCancel: () => void;
  onDelete?: () => void | Promise<void>;
}

export default function PlaceEditor({ place: p, onSave, onCancel, onDelete }: Props) {
  const { t } = useLanguage();
  const [tags, setTags] = useState<string[]>(p.tags ?? []);
  const [rating, setRating] = useState<number | null>(p.rating);
  const [note, setNote] = useState(p.note ?? "");
  const [placeType, setPlaceType] = useState(p.placeType ?? "restaurant");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!onDelete || deleting) return;
    setDeleting(true);
    try {
      await onDelete();
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
      <TypeCombobox value={placeType} onChange={setPlaceType} />
      <TagCombobox value={tags} onChange={setTags} />
      <Stars value={rating} onChange={setRating} />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="edge radius-input w-full border-line bg-surface px-2 py-1.5 text-sm text-ink placeholder:text-muted"
        rows={2}
        placeholder={t["tags.notePlaceholder"]}
      />
      <div className="flex gap-2">
        {onDelete && (
          <button
            type="button"
            className="edge radius-input mr-auto border-danger-line bg-danger-bg px-3 py-1.5 text-sm font-medium text-danger-ink transition hover:brightness-95"
            onClick={() => setConfirmOpen(true)}
          >
            🗑️ {t["editor.delete"]}
          </button>
        )}
        <button type="button" className="edge radius-input border-line bg-surface px-3 py-1.5 text-sm text-ink" onClick={onCancel}>
          {t["editor.cancel"]}
        </button>
        <button
          type="button"
          className="edge radius-input border-accent bg-accent px-3 py-1.5 text-sm text-accent-ink"
          onClick={() => onSave({ tags, rating, note: note || null, placeType: placeType.trim().toLowerCase() || "restaurant" })}
        >
          {t["editor.save"]}
        </button>
      </div>

      {confirmOpen && onDelete && (
        <ConfirmDialog
          title={t["editor.deleteTitle"]}
          placeName={p.name}
          body={
            typeof t["editor.deleteBody"] === "function"
              ? (t["editor.deleteBody"] as (name: string) => string)(p.name)
              : typeof t["editor.deleteConfirm"] === "function"
                ? (t["editor.deleteConfirm"] as (name: string) => string)(p.name)
                : "This cannot be undone."
          }
          warning={t["editor.deleteWarning"]}
          confirmLabel={t["editor.deleteConfirmCta"]}
          cancelLabel={t["editor.deleteCancel"]}
          pendingLabel={t["editor.deleting"]}
          pending={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => { if (!deleting) setConfirmOpen(false); }}
        />
      )}
    </div>
  );
}
