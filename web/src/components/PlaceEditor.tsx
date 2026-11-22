import { useEffect, useState } from "react";
import type { Place } from "../lib/api";
import TagCombobox, { type TagMutation } from "./TagCombobox";
import IconPicker from "./IconPicker";
import Stars from "./Stars";
import ConfirmDialog from "./ConfirmDialog";
import { useLanguage } from "../i18n/LanguageContext";

type PlaceStatus = "WANT_TO_GO" | "BEEN_TO"; // mirror of api.ts Place.status

interface Props {
  place: Place;
  onSave: (patch: {
    tags: string[];
    rating: number | null;
    note: string | null;
    icon: string;
    status?: PlaceStatus;
  }) => void;
  onCancel: () => void;
  onDelete?: () => void | Promise<void>;
  onTagDefinitionsChanged?: (m: TagMutation) => void;
}

function scoreLabel(r: number | null): string {
  if (r == null) return "Unrated";
  if (r >= 5) return "Exceptional";
  if (r >= 4) return "Superb";
  if (r >= 3) return "Lovely";
  return "Noted";
}

export default function PlaceEditor({
  place: p,
  onSave,
  onCancel,
  onDelete,
  onTagDefinitionsChanged,
}: Props) {
  const { t } = useLanguage();
  const [tags, setTags] = useState<string[]>(p.tags ?? []);
  const [rating, setRating] = useState<number | null>(p.rating);
  const [note, setNote] = useState(p.note ?? "");
  const [icon, setIcon] = useState(p.icon ?? "fork");
  const [status, setStatus] = useState<PlaceStatus>(
    (p.status as PlaceStatus | undefined) ?? "WANT_TO_GO",
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Re-sync local draft when a different place (or a refreshed snapshot) arrives.
  // (Call sites also key by id+updatedAt; this covers in-place prop updates.)
  useEffect(() => {
    setTags(p.tags ?? []);
    setRating(p.rating);
    setNote(p.note ?? "");
    setIcon(p.icon ?? "fork");
    setStatus((p.status as PlaceStatus | undefined) ?? "WANT_TO_GO");
  }, [p]);

  async function confirmDelete() {
    if (!onDelete || deleting) return;
    setDeleting(true);
    try {
      await onDelete();
      setConfirmOpen(false);
    } catch {
      // parent already surfaces t["editor.deleteFailed"]; keep dialog open for retry
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      {/* Header: title + editing badge */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-lg font-semibold text-ink">{p.name}</span>
        {p.rating != null && (
          <span
            className="edge inline-flex items-center gap-1 border-line bg-surface-2 px-2 py-0.5 text-xs font-bold text-ink"
            style={{ borderRadius: 999 }}
          >
            ★ {Number(p.rating).toFixed(1)}
          </span>
        )}
        <span
          className="edge inline-flex items-center gap-1 border-line bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted"
          style={{ borderRadius: 999 }}
        >
          ✎ Editing place
        </span>
      </div>
      {p.address && <p className="mt-1 text-xs text-muted">📍 {p.address}</p>}

      {/* Status segmented */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div
          className="edge inline-flex bg-surface-2 p-1"
          style={{ borderRadius: 999 }}
          role="group"
          aria-label="Visit status"
        >
          <button
            type="button"
            onClick={() => {
              setStatus("WANT_TO_GO");
            }}
            aria-pressed={status === "WANT_TO_GO"}
            className={`inline-flex min-h-[36px] items-center gap-1 px-3 text-xs font-semibold ${status === "WANT_TO_GO" ? "bg-surface text-ink shadow-theme" : "text-muted"}`}
            style={{ borderRadius: 999 }}
          >
            🔖 Want to go
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus("BEEN_TO");
            }}
            aria-pressed={status === "BEEN_TO"}
            className={`inline-flex min-h-[36px] items-center gap-1 px-3 text-xs font-semibold ${status === "BEEN_TO" ? "bg-been text-been-ink shadow-theme" : "text-muted"}`}
            style={{ borderRadius: 999 }}
          >
            ✓ Been here
          </button>
        </div>
      </div>

      {/* Icon */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Icon</span>
          <span className="text-[11px] text-muted">Shown on map &amp; timeline</span>
        </div>
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      {/* Tags */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Tags &amp; Cuisine
          </span>
          <span className="text-[11px] text-muted">{tags.length} active</span>
        </div>
        <div className="edge border-line bg-surface-2/60 p-2" style={{ borderRadius: 12 }}>
          <TagCombobox
            value={tags}
            onChange={setTags}
            onTagDefinitionsChanged={onTagDefinitionsChanged}
          />
          <p className="mt-1.5 text-[11px] text-muted">
            Suggestions: + French Bistro · + Candlelight · + Wood-fired
          </p>
        </div>
      </div>

      {/* Rating */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Your Rating
          </span>
          <span
            className="edge bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-ink"
            style={{ borderRadius: 999 }}
          >
            {(rating ?? 0).toFixed(1)} / 5.0
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Stars value={rating} onChange={setRating} />
          <span className="text-xs text-muted">{scoreLabel(rating)}</span>
        </div>
      </div>

      {/* Note */}
      <div className="mt-3">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
          Note
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="edge w-full border-line bg-surface-2/60 px-3 py-2 text-sm text-ink placeholder:text-muted"
          style={{ borderRadius: 12 }}
          rows={3}
          placeholder={t["tags.notePlaceholder"]}
        />
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        {onDelete && (
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center gap-1.5 px-2 text-sm font-semibold text-danger-ink hover:underline"
            onClick={() => setConfirmOpen(true)}
            aria-label={t["editor.delete"]}
            title={t["editor.delete"]}
          >
            🗑 Delete place
          </button>
        )}
        <span className="flex-1" />
        <button
          type="button"
          className="edge inline-flex min-h-[44px] items-center justify-center border-line bg-surface-2 px-4 text-sm font-semibold text-ink"
          style={{ borderRadius: 999 }}
          onClick={onCancel}
        >
          {t["editor.cancel"]}
        </button>
        <button
          type="button"
          className="edge inline-flex min-h-[44px] items-center justify-center gap-1.5 border-accent bg-accent px-5 text-sm font-semibold text-accent-ink"
          style={{ borderRadius: 999 }}
          onClick={() =>
            onSave({
              tags,
              rating,
              note: note || null,
              icon: icon.trim().toLowerCase() || "fork",
              status,
            })
          }
        >
          ✓ Save Changes
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
          onCancel={() => {
            if (!deleting) setConfirmOpen(false);
          }}
        />
      )}
    </div>
  );
}
