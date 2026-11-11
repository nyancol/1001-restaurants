import { useState } from "react";
import type { Place } from "../lib/api";
import TagCombobox from "./TagCombobox";
import Stars from "./Stars";

interface Props {
  place: Place;
  onSave: (patch: { tags: string[]; rating: number | null; note: string | null }) => void;
  onCancel: () => void;
}

export default function PlaceEditor({ place: p, onSave, onCancel }: Props) {
  const [tags, setTags] = useState<string[]>(p.tags);
  const [rating, setRating] = useState<number | null>(p.rating);
  const [note, setNote] = useState(p.note ?? "");

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
      <TagCombobox value={tags} onChange={setTags} />
      <Stars value={rating} onChange={setRating} />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="edge radius-input w-full border-line bg-surface px-2 py-1.5 text-sm text-ink placeholder:text-muted"
        rows={2}
        placeholder="Note"
      />
      <div className="flex gap-2">
        <button type="button" className="edge radius-input border-line bg-surface px-3 py-1.5 text-sm text-ink" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="edge radius-input border-accent bg-accent px-3 py-1.5 text-sm text-accent-ink"
          onClick={() => onSave({ tags, rating, note: note || null })}
        >
          Save
        </button>
      </div>
    </div>
  );
}
