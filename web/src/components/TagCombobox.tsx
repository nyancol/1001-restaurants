import { useEffect, useState } from "react";
import { getTags } from "../lib/api";

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
}

const cache = new Map<string, { tag: string; count: number }[]>();

export default function TagCombobox({ value, onChange }: Props) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<{ tag: string; count: number }[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = input.trim().toLowerCase();
    if (!q) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      if (cache.has(q)) {
        setSuggestions(cache.get(q)!);
        return;
      }
      setLoading(true);
      try {
        const tags = await getTags(q);
        cache.set(q, tags);
        setSuggestions(tags);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [input]);

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase();
    if (!t || value.includes(t)) {
      setInput("");
      setSuggestions([]);
      return;
    }
    onChange([...value, t]);
    setInput("");
    setSuggestions([]);
    setOpen(false);
  }

  function removeTag(t: string) {
    onChange(value.filter((x) => x !== t));
  }

  const exactMatch = suggestions.some((s) => s.tag === input.trim().toLowerCase());

  return (
    <div className="relative">
      <label className="mb-1 block text-sm font-medium text-ink">Tags</label>
      <div className="mb-1 flex flex-wrap gap-1">
        {value.map((t) => (
          <span key={t} className="edge radius-pill inline-flex items-center gap-1 border-line bg-surface-2 px-2 py-0.5 text-sm text-ink">
            {t}
            <button type="button" aria-label={`remove ${t}`} className="text-muted hover:text-ink" onClick={() => removeTag(t)}>
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (input.trim()) addTag(input);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Type to suggest, Enter to create"
        className="edge radius-input w-full border-line bg-surface px-3 py-2 text-ink placeholder:text-muted"
        aria-label="tag input"
      />
      {open && (input.trim() || loading) && (
        <div className="edge radius-card absolute z-10 mt-1 w-full border-line bg-surface shadow-theme">
          {loading && <div className="px-3 py-2 text-sm text-muted">Loading…</div>}
          {!loading &&
            suggestions.map((s) => (
              <button
                key={s.tag}
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink hover:bg-surface-2"
                onClick={() => addTag(s.tag)}
              >
                <span>{s.tag}</span>
                <span className="font-telemetry text-muted">{s.count}</span>
              </button>
            ))}
          {!loading && input.trim() && !exactMatch && (
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm text-accent hover:bg-surface-2"
              onClick={() => addTag(input)}
            >
              Create “{input.trim().toLowerCase()}” ⏎
            </button>
          )}
          {!loading && input.trim() && suggestions.length === 0 && exactMatch === false && (
            <div className="px-3 py-2 text-sm text-muted">No matches — press Enter to create.</div>
          )}
        </div>
      )}
    </div>
  );
}
