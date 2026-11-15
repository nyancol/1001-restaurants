import { useState } from "react";
import type { Place } from "../lib/api";
import TagCombobox, { type TagMutation } from "./TagCombobox";
import IconPicker from "./IconPicker";
import Stars from "./Stars";
import ConfirmDialog from "./ConfirmDialog";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  place: Place;
  onSave: (patch: { tags: string[]; rating: number | null; note: string | null; icon: string }) => void;
  onCancel: () => void;
  onDelete?: () => void | Promise<void>;
  onTagDefinitionsChanged?: (m: TagMutation) => void;
}

export default function PlaceEditor({ place: p, onSave, onCancel, onDelete, onTagDefinitionsChanged }: Props) {
  const { t } = useLanguage();
  const [tags, setTags] = useState<string[]>(p.tags ?? []);
  const [rating, setRating] = useState<number | null>(p.rating);
  const [note, setNote] = useState(p.note ?? "");
  const [icon, setIcon] = useState((p.icon ?? "fork"));
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
      <IconPicker value={icon} onChange={setIcon} />
      <TagCombobox value={tags} onChange={setTags} onTagDefinitionsChanged={onTagDefinitionsChanged} />
      <Stars value={rating} onChange={setRating} />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="edge radius-input w-full border-line bg-surface px-2 py-1.5 text-sm text-ink placeholder:text-muted"
        rows={2}
        placeholder={t["tags.notePlaceholder"]}
      />
      <div className="flex items-center gap-2">
        {onDelete && (
          <button
            type="button"
            className="edge radius-input inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center border-danger-line bg-danger-bg text-danger-ink transition hover:brightness-95"
            onClick={() => setConfirmOpen(true)}
            aria-label={t["editor.delete"]}
            title={t["editor.delete"]}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" x2="10" y1="11" y2="17" />
              <line x1="14" x2="14" y1="11" y2="17" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="edge radius-input inline-flex min-h-[44px] flex-1 items-center justify-center border-line bg-surface px-4 text-sm font-medium text-ink transition hover:bg-surface-2"
          onClick={onCancel}
        >
          {t["editor.cancel"]}
        </button>
        <button
          type="button"
          className="edge radius-input inline-flex min-h-[44px] flex-1 items-center justify-center border-accent bg-accent px-4 text-sm font-semibold text-accent-ink transition hover:brightness-95 active:brightness-90"
          onClick={() => onSave({ tags, rating, note: note || null, icon: icon.trim().toLowerCase() || "fork" })}
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
