import { useEffect, useState } from "react";
import type { Place } from "../../lib/api";
import BottomSheet from "./BottomSheet";
import IconPicker from "../IconPicker";
import TagCombobox from "../TagCombobox";
import Stars from "../Stars";
import ConfirmDialog from "../ConfirmDialog";
import { useLanguage } from "../../i18n/LanguageContext";

function scoreLabel(r: number | null): string {
  if (r == null) return "Unrated";
  if (r >= 5) return "Exceptional";
  if (r >= 4) return "Superb";
  if (r >= 3) return "Lovely";
  return "Noted";
}

function displayRating(r: number | null): string {
  if (r == null) return "–";
  return r.toFixed(1);
}

interface Patch {
  tags: string[];
  rating: number | null;
  note: string | null;
  icon: string;
  status?: string;
}

interface Props {
  place: Place | null;
  onClose: () => void;
  onSave: (p: Place, patch: Patch) => Promise<void> | void;
  onDelete?: (p: Place) => Promise<void> | void;
  onTagDefinitionsChanged?: (m: import("../TagCombobox").TagMutation) => void;
}

/** Phone "Edit Place" sheet from Stitch. */
export default function EditPlaceSheet({ place, onClose, onSave, onDelete, onTagDefinitionsChanged }: Props) {
  const { t } = useLanguage();
  const [tags, setTags] = useState<string[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [icon, setIcon] = useState("fork");
  const [status, setStatus] = useState("WANT_TO_GO");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (place) {
      setTags(place.tags ?? []);
      setRating(place.rating ?? null);
      setNote(place.note ?? "");
      setIcon((place.icon ?? "fork").toLowerCase());
      setStatus(place.status ?? "WANT_TO_GO");
      setError(null);
      setConfirmOpen(false);
    }
  }, [place?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!place || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(place, { tags, rating, note: note.trim() ? note : null, icon: icon.trim().toLowerCase() || "fork", status });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!place || !onDelete || deleting) return;
    setDeleting(true);
    try {
      await onDelete(place);
      setConfirmOpen(false);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setConfirmOpen(false); // reveal the inline error instead of leaving the dialog covering it
    } finally {
      setDeleting(false);
    }
  }

  const priceLevelRaw = place?.priceLevel != null ? String(place.priceLevel).trim() : "";
  const price = priceLevelRaw !== "" ? priceLevelRaw : "–";

  return (
    <BottomSheet open={place != null} onClose={onClose} ariaLabel="Edit place">
      {place && (
        <>
          <div className="flex items-center justify-between px-4 pb-1 pt-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink">
              <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-accent" /> Edit place
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close edit place"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2/70 text-xl text-ink"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ overscrollBehavior: "contain" }}>
            <div className="flex items-center gap-2">
              <h2 className="font-display flex-1 text-[26px] font-bold leading-tight text-ink">{place.name}</h2>
              <span className="edge inline-flex items-center gap-1 border-transparent bg-want px-2.5 py-1.5 text-sm font-bold text-want-ink" style={{ borderRadius: 12 }}>
                <span aria-hidden>★</span> {displayRating(place.googleRating ?? place.rating)}
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
              <span aria-hidden>📍</span> {place.address ?? "Paris"} • {price}
            </p>

            <div className="edge mt-3 grid grid-cols-2 gap-1 border-transparent bg-surface-2/50 p-1" style={{ borderRadius: 12 }} role="group" aria-label="Visit status">
              <button
                type="button"
                aria-pressed={status === "WANT_TO_GO"}
                onClick={() => setStatus("WANT_TO_GO")}
                className={`inline-flex min-h-[48px] items-center justify-center gap-1.5 text-sm font-bold ${status === "WANT_TO_GO" ? "bg-surface text-ink shadow-theme" : "text-muted"}`}
                style={{ borderRadius: 9 }}
              >
                <span aria-hidden>🔖</span> Want to go
              </button>
              <button
                type="button"
                aria-pressed={status === "BEEN_TO"}
                onClick={() => setStatus("BEEN_TO")}
                className={`inline-flex min-h-[48px] items-center justify-center gap-1.5 text-sm font-bold ${status === "BEEN_TO" ? "bg-accent text-accent-ink shadow-theme" : "text-muted"}`}
                style={{ borderRadius: 9 }}
              >
                <span aria-hidden>✓</span> Been here
              </button>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Icon (shown on map &amp; timeline)</h3>
              </div>
              <IconPicker value={icon} onChange={setIcon} />
            </div>

            <div className="mt-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Tags</h3>
              <div className="edge border-line/50 bg-surface p-2" style={{ borderRadius: 12 }}>
                <TagCombobox value={tags} onChange={setTags} onTagDefinitionsChanged={onTagDefinitionsChanged} />
              </div>
            </div>

            <div className="edge mt-4 border-line/50 bg-surface-2/40 p-3" style={{ borderRadius: 12 }}>
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Your rating</h3>
                <span className="edge inline-flex bg-been px-2 py-0.5 text-xs font-bold text-been-ink" style={{ borderRadius: 999 }}>
                  {(rating ?? 0).toFixed(1)} / 5.0
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Stars value={rating} onChange={setRating} />
                <span className="font-display text-sm italic text-accent">“{scoreLabel(rating)}”</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">My personal note</h3>
                <span className="text-[11px] text-muted">Markdown supported</span>
              </div>
              <div className="edge border-line/50 bg-surface-2/40 p-3" style={{ borderRadius: 12 }}>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder="What made this memorable?"
                  aria-label="My personal note"
                  className="w-full bg-transparent text-[15px] leading-relaxed text-ink outline-none placeholder:text-muted"
                />
                <div className="mt-1 text-right text-[11px] text-muted">{note.length} characters</div>
              </div>
            </div>

            {error && (
              <div className="edge mt-3 border-danger-line bg-danger-bg px-2 py-1.5 text-xs text-danger-ink" style={{ borderRadius: 8 }} role="alert">
                {error}
              </div>
            )}
            <div className="h-2" />
          </div>

          <div className="grid grid-cols-[auto_auto_1fr] items-center gap-2 border-t border-line/60 bg-[#fff8e8] p-4">
            {onDelete && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                aria-label={String(t["editor.delete"] ?? "Delete place")}
                className="edge inline-flex min-h-[52px] items-center gap-1.5 border-transparent bg-danger-bg px-4 text-base font-bold text-danger-ink"
                style={{ borderRadius: 12 }}
              >
                <span aria-hidden>🗑</span> Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="edge inline-flex min-h-[52px] items-center justify-center border-line bg-surface-2/60 px-5 text-base font-bold text-ink"
              style={{ borderRadius: 12 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="edge inline-flex min-h-[52px] items-center justify-center gap-2 border-accent bg-accent px-4 text-base font-bold text-accent-ink disabled:opacity-50"
              style={{ borderRadius: 12 }}
            >
              <span aria-hidden>✓</span> {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </>
      )}
      {confirmOpen && place && onDelete && (
        <ConfirmDialog
          title={String(t["editor.deleteTitle"] ?? "Delete place")}
          placeName={place.name}
          body="This cannot be undone."
          warning={String(t["editor.deleteWarning"] ?? "")}
          confirmLabel={String(t["editor.deleteConfirmCta"] ?? "Delete")}
          cancelLabel={String(t["editor.deleteCancel"] ?? "Cancel")}
          pendingLabel={String(t["editor.deleting"] ?? "Deleting…")}
          pending={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            if (!deleting) setConfirmOpen(false);
          }}
        />
      )}
    </BottomSheet>
  );
}
