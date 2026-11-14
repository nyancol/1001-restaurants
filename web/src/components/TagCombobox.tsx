import React, { useEffect, useMemo, useState } from "react";
import { getTags } from "../lib/api";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  // Filter contexts must pass false so no new tag can be coined there;
  // creation stays in add/edit flows only. Defaults to true.
  allowCreate?: boolean;
  // FilterBar renders its own active-filter chips above, so hide the
  // duplicate list inside the combobox in that context. Defaults to true.
  showSelected?: boolean;
  // `combobox` (default): type-to-reveal suggestions, used in add/edit.
  // `filter-list`: always-visible ranked list with counts for filtering,
  // used in the desktop rail and the phone tag disclosure.
  variant?: "combobox" | "filter-list";
}

const cache = new Map<string, { tag: string; count: number }[]>();

async function cachedTags(q: string): Promise<{ tag: string; count: number }[]> {
  if (cache.has(q)) return cache.get(q)!;
  const tags = await getTags(q);
  cache.set(q, tags);
  return tags;
}

export default function TagCombobox({ value, onChange, allowCreate = true, showSelected = true, variant = "combobox" }: Props) {
  if (variant === "filter-list") {
    return <FilterTagList value={value} onChange={onChange} />;
  }
  return <Combobox value={value} onChange={onChange} allowCreate={allowCreate} showSelected={showSelected} />;
}

function FilterTagList({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const { t } = useLanguage();
  const [all, setAll] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    cachedTags("")
      .then((tags) => { if (!cancelled) setAll(tags); })
      .catch(() => { if (!cancelled) setAll([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((t) => t.tag.includes(q));
  }, [all, search]);

  function toggle(tag: string) {
    if (value.includes(tag)) onChange(value.filter((t) => t !== tag));
    else onChange([...value, tag]);
  }

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t["tags.searchPlaceholder"]}
        aria-label={t["tags.searchAria"]}
        className="edge radius-input min-h-[44px] w-full border-line bg-bg px-3 py-2 text-base text-ink placeholder:text-muted lg:min-h-9 lg:text-sm"
      />
      {loading && <div className="px-1 py-2 text-sm text-muted">{t["tags.loadingTags"]}</div>}
      {!loading && visible.length === 0 && (
        <div className="px-1 py-2 text-sm text-muted">{all.length === 0 ? t["tags.noTags"] : t["tags.noMatches"]}</div>
      )}
      {!loading && visible.length > 0 && (
        <ul className="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto" role="listbox" aria-label={t["tags.filterOptionsAria"]} aria-multiselectable="true">
          {visible.map((s) => {
            const active = value.includes(s.tag);
            return (
              <li key={s.tag}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  aria-label={t["tags.filterOption"](active ? t["tags.removeAction"] : t["tags.addAction"], s.tag, s.count)}
                  onClick={() => toggle(s.tag)}
                  className={`edge radius-input flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-sm lg:min-h-9 ${
                    active ? "border-accent bg-accent font-medium text-accent-ink" : "border-line bg-surface text-ink hover:bg-surface-2"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span aria-hidden>{active ? "☑" : "☐"}</span>
                    <span className="truncate">#{s.tag}</span>
                  </span>
                  <span className={`font-telemetry shrink-0 ${active ? "text-accent-ink opacity-80" : "text-muted"}`}>{s.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Combobox({ value, onChange, allowCreate, showSelected }: { value: string[]; onChange: (tags: string[]) => void; allowCreate: boolean; showSelected: boolean }) {
  const { t } = useLanguage();
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
      setLoading(true);
      try {
        const tags = await cachedTags(q);
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
      <label className="mb-1 block text-sm font-medium text-ink" htmlFor="tag-input">{t["tags.label"]}</label>
      {showSelected && (
      <div className="mb-1 flex flex-wrap gap-1">
        {value.map((t) => (
          <span key={t} className="edge radius-pill inline-flex items-center gap-1 border-line bg-surface-2 px-2 py-0.5 text-sm text-ink">
            {t}
            <button type="button" aria-label={t["tags.removeTag"](t)} className="text-muted hover:text-ink" onClick={() => removeTag(t)}>
              ×
            </button>
          </span>
        ))}
      </div>
      )}
      <input
        id="tag-input"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (!input.trim()) return;
            if (allowCreate || exactMatch) addTag(input);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={allowCreate ? t["tags.suggestCreate"] : t["tags.filterExisting"]}
        className="edge radius-input w-full border-line bg-surface px-3 py-2 text-ink placeholder:text-muted"
        aria-label={t["tags.tagInputAria"]}
      />
      {open && (input.trim() || loading) && (
        <div className="edge radius-card absolute z-10 mt-1 w-full border-line bg-surface shadow-theme">
          {loading && <div className="px-3 py-2 text-sm text-muted">{t["tags.loading"]}</div>}
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
          {allowCreate && !loading && input.trim() && !exactMatch && (
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm text-accent hover:bg-surface-2"
              onClick={() => addTag(input)}
            >
              {t["tags.createPrompt"](input)}
            </button>
          )}
          {!loading && input.trim() && suggestions.length === 0 && exactMatch === false && (
            <div className="px-3 py-2 text-sm text-muted">
              {allowCreate ? t["tags.noMatchesCreate"] : t["tags.noMatches"]}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
