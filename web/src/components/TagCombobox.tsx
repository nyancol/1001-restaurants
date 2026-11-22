import React, { useEffect, useMemo, useRef, useState } from "react";
import { createTag, deleteTag, getTags, patchTag, type TagCount } from "../lib/api";
import { invalidateTagColors, TAG_COLORS_EVENT } from "../lib/useTagColors";
import { colorForTag, TAG_PALETTE } from "../lib/tagPalette";
import TagDot from "./TagDot";
import { useLanguage } from "../i18n/LanguageContext";

export type TagMutation =
  | { type: "rename"; oldName: string; newName: string }
  | { type: "delete"; name: string }
  | { type: "recolor"; name: string }
  | { type: "create"; name: string };

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  allowCreate?: boolean;
  showSelected?: boolean;
  variant?: "combobox" | "filter-list";
  onTagDefinitionsChanged?: (m: TagMutation) => void;
}

const cache = new Map<string, TagCount[]>();

export function invalidateTagCache() {
  cache.clear();
  invalidateTagColors();
}

async function cachedTags(q: string): Promise<TagCount[]> {
  if (cache.has(q)) return cache.get(q)!;
  const tags = await getTags(q);
  cache.set(q, tags);
  return tags;
}

/** Bypass the cache and force a fresh fetch (for event-triggered reloads). */
async function fetchFreshTags(q: string): Promise<TagCount[]> {
  const tags = await getTags(q);
  cache.set(q, tags);
  return tags;
}

export default function TagCombobox({ value, onChange, allowCreate = true, showSelected = true, variant = "combobox", onTagDefinitionsChanged }: Props) {
  if (variant === "filter-list") {
    return <FilterTagList value={value} onChange={onChange} />;
  }
  return <Combobox value={value} onChange={onChange} allowCreate={allowCreate} showSelected={showSelected} onTagDefinitionsChanged={onTagDefinitionsChanged} />;
}

function colorMap(list: TagCount[]): Map<string, string> {
  return new Map(list.map((t) => [t.tag, t.color]));
}

function FilterTagList({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const { t } = useLanguage();
  const [all, setAll] = useState<TagCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    let seq = 0;
    function load(opts?: { force?: boolean }) {
      const my = ++seq;
      setLoading(true);
      const p = opts?.force ? fetchFreshTags("") : cachedTags("");
      p.then((tags) => { if (!cancelled && my === seq) setAll(tags); })
        .catch(() => { if (!cancelled && my === seq) setAll([]); })
        .finally(() => { if (!cancelled && my === seq) setLoading(false); });
    }
    load();
    // Option A: live refresh without page reload when definitions change elsewhere.
    // Forced fresh fetch + sequence guard so an out-of-order (stale) response
    // can never overwrite newer counts.
    const onEvent = () => load({ force: true });
    window.addEventListener(TAG_COLORS_EVENT, onEvent);
    return () => { cancelled = true; window.removeEventListener(TAG_COLORS_EVENT, onEvent); };
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((tg) => tg.tag.includes(q));
  }, [all, search]);

  function toggle(tag: string) {
    if (value.includes(tag)) onChange(value.filter((x) => x !== tag));
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
                    <TagDot color={s.color ?? colorForTag(s.tag)} />
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

function ManageMenu({
  tag, color, onClose, onRename, onRecolor, onDelete,
}: {
  tag: string; color: string;
  onClose: () => void;
  onRename: (next: string) => void;
  onRecolor: (next: string) => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"menu" | "rename" | "color" | "delete">("menu");
  const [draft, setDraft] = useState(tag);
  return (
    <div
      role="menu"
      aria-label={t["tags.manageMenuAria"](tag)}
      className="edge radius-card absolute z-20 mt-1 w-56 border-line bg-surface p-1 shadow-theme"
      onClick={(e) => e.stopPropagation()}
    >
      {mode === "menu" && (
        <>
          <button type="button" role="menuitem" onClick={() => setMode("rename")} className="flex w-full px-3 py-2 text-left text-sm hover:bg-surface-2">{t["tags.rename"]}</button>
          <button type="button" role="menuitem" onClick={() => setMode("color")} className="flex w-full px-3 py-2 text-left text-sm hover:bg-surface-2">{t["tags.changeColor"]}</button>
          <button type="button" role="menuitem" aria-label={t["tags.deleteTagAria"](tag)} onClick={() => setMode("delete")} className="flex w-full px-3 py-2 text-left text-sm text-danger-ink hover:bg-surface-2">{t["tags.deleteTag"]}</button>
          <button type="button" onClick={onClose} className="flex w-full px-3 py-2 text-left text-xs text-muted hover:bg-surface-2">{t["tags.cancel"]}</button>
        </>
      )}
      {mode === "rename" && (
        <div className="p-2">
          <label className="text-xs text-muted">{t["tags.renamePrompt"](tag)}</label>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="edge radius-input mt-1 w-full border-line bg-bg px-2 py-1.5 text-sm"
            aria-label={t["tags.renameAria"](tag)}
          />
          <div className="mt-2 flex gap-1.5">
            <button type="button" onClick={() => { if (draft.trim()) onRename(draft); }} className="radius-input bg-accent px-3 py-1.5 text-sm text-accent-ink">{t["tags.renameConfirm"]}</button>
            <button type="button" onClick={() => setMode("menu")} className="radius-input px-3 py-1.5 text-sm text-muted">{t["tags.cancel"]}</button>
          </div>
        </div>
      )}
      {mode === "color" && (
        <div className="p-2">
          <p className="mb-2 text-xs text-muted">{t["tags.changeColorAria"](tag)}</p>
          <div className="grid grid-cols-8 gap-1.5" role="group" aria-label={t["tags.changeColorAria"](tag)}>
            {TAG_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onRecolor(c)}
                aria-label={c}
                aria-pressed={c === color}
                title={c}
                style={{
                  width: 24, height: 24, borderRadius: 9999, backgroundColor: c,
                  outline: c === color ? "2px solid currentColor" : "1px solid rgba(0,0,0,0.25)",
                  outlineOffset: 1,
                }}
              />
            ))}
          </div>
          <button type="button" onClick={() => setMode("menu")} className="mt-2 text-xs text-muted">{t["tags.cancel"]}</button>
        </div>
      )}
      {mode === "delete" && (
        <div className="p-2">
          <p className="text-sm">{t["tags.deleteConfirm"](tag)}</p>
          <div className="mt-2 flex gap-1.5">
            <button type="button" aria-label={t["tags.deleteTagAria"](tag)} onClick={onDelete} className="radius-input bg-danger-bg px-3 py-1.5 text-sm text-danger-ink">{t["tags.deleteConfirmCta"]}</button>
            <button type="button" onClick={() => setMode("menu")} className="radius-input px-3 py-1.5 text-sm text-muted">{t["tags.cancel"]}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditablePill({
  tag, color, colors, allTags, value, onChange, onTagDefinitionsChanged,
}: {
  tag: string; color: string; colors: Map<string, string>; allTags: TagCount[];
  value: string[]; onChange: (tags: string[]) => void;
  onTagDefinitionsChanged?: (m: TagMutation) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pressTimer = useRef<any>(null);

  function close() { setOpen(false); setError(null); }

  function startPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      try { (navigator as any).vibrate?.(10); } catch { /* ignore */ }
      setOpen(true);
    }, 500);
  }
  function cancelPress() {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  }

  async function handleRename(nextRaw: string) {
    const next = nextRaw.trim().toLowerCase();
    if (!next || next === tag) { close(); return; }
    const existsDef = allTags.some((x) => x.tag === next);
    const existsValue = value.includes(next);
    if ((existsDef || existsValue) && !window.confirm(t["tags.mergeConfirm"](tag, next))) return;
    const prev = [...value];
    const optimistic = value.map((x) => (x === tag ? next : x));
    // collapse dupes from merge
    const deduped = [...new Set(optimistic)];
    onChange(deduped);
    try {
      const res = await patchTag(tag, { newName: next });
      invalidateTagCache();
      // adopt server color (merge keeps target color)
      if (res?.color) colors.set(res.tag, res.color);
      onTagDefinitionsChanged?.({ type: "rename", oldName: tag, newName: res?.tag ?? next });
      close();
    } catch {
      onChange(prev);
      setError(t["tags.manageFailed"]);
    }
  }

  async function handleRecolor(next: string) {
    try {
      await patchTag(tag, { color: next });
      invalidateTagCache();
      colors.set(tag, next);
      onTagDefinitionsChanged?.({ type: "recolor", name: tag });
      // force refresh of suggestions
      close();
      // trigger parent refresh by toggling no-op: parent re-reads via cache invalidation on next open
    } catch {
      setError(t["tags.manageFailed"]);
    }
  }

  async function handleDelete() {
    if (!window.confirm(t["tags.deleteConfirm"](tag))) return;
    const prev = [...value];
    onChange(value.filter((x) => x !== tag));
    try {
      await deleteTag(tag);
      invalidateTagCache();
      onTagDefinitionsChanged?.({ type: "delete", name: tag });
      close();
    } catch {
      onChange(prev);
      setError(t["tags.manageFailed"]);
    }
  }

  return (
    <span
      className="edge radius-pill relative inline-flex items-center gap-1.5 border-line bg-surface-2 py-0.5 pl-2 pr-1 text-sm text-ink"
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
    >
      <TagDot color={color} />
      {tag}
      <button type="button" aria-label={t["tags.removeTag"](tag)} className="text-muted hover:text-ink" onClick={() => onChange(value.filter((x) => x !== tag))}>
        ×
      </button>
      <button
        type="button"
        aria-label={t["tags.manageMenuAria"](tag)}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="px-1 text-muted hover:text-ink"
      >
        …
      </button>
      {open && (
        <ManageMenu tag={tag} color={color} onClose={close} onRename={handleRename} onRecolor={handleRecolor} onDelete={handleDelete} />
      )}
      {error && <span role="alert" className="sr-only">{error}</span>}
    </span>
  );
}

function Combobox({ value, onChange, allowCreate, showSelected, onTagDefinitionsChanged }: { value: string[]; onChange: (tags: string[]) => void; allowCreate: boolean; showSelected: boolean; onTagDefinitionsChanged?: (m: TagMutation) => void }) {
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<TagCount[]>([]);
  const [allDefs, setAllDefs] = useState<TagCount[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let seq = 0;
    function load(opts?: { force?: boolean }) {
      const my = ++seq;
      const p = opts?.force ? fetchFreshTags("") : cachedTags("");
      p.then((tags) => { if (!cancelled && my === seq) setAllDefs(tags); }).catch(() => {});
    }
    load();
    const onEvent = () => load({ force: true });
    window.addEventListener(TAG_COLORS_EVENT, onEvent);
    return () => { cancelled = true; window.removeEventListener(TAG_COLORS_EVENT, onEvent); };
  }, [value.length]);

  useEffect(() => {
    const q = input.trim().toLowerCase();
    if (!q) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const tt = setTimeout(() => {
      setLoading(true);
      cachedTags(q)
        .then((tags) => { if (!cancelled) setSuggestions(tags); })
        .catch(() => { if (!cancelled) setSuggestions([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(tt); };
  }, [input]);

  const colors = useMemo(() => colorMap(allDefs), [allDefs]);

  function pillColor(tag: string): string {
    return colors.get(tag) ?? colorForTag(tag);
  }

  function addTag(raw: string) {
    const tg = raw.trim().toLowerCase();
    if (!tg || value.includes(tg)) {
      setInput("");
      setSuggestions([]);
      return;
    }
    // Provisional: definition ensured server-side on place save; preview deterministic color now.
    if (!colors.has(tg)) {
      colors.set(tg, colorForTag(tg));
      // Best-effort eager create so manage menu works pre-save; ignore races.
      createTag(tg).then(() => { invalidateTagCache(); onTagDefinitionsChanged?.({ type: "create", name: tg }); }).catch(() => {});
    }
    onChange([...value, tg]);
    setInput("");
    setSuggestions([]);
    setOpen(false);
  }

  function removeTag(tag: string) {
    onChange(value.filter((x) => x !== tag));
  }

  const exactMatch = suggestions.some((s) => s.tag === input.trim().toLowerCase());
  const provisional = input.trim().toLowerCase();

  return (
    <div className="relative">
      <label className="mb-1 block text-sm font-medium text-ink" htmlFor="tag-input">{t["tags.label"]}</label>
      {showSelected && (
      <div className="mb-1 flex flex-wrap gap-1">
        {value.map((tag) => (
          <EditablePill key={tag} tag={tag} color={pillColor(tag)} colors={colors} allTags={allDefs} value={value} onChange={onChange} onTagDefinitionsChanged={onTagDefinitionsChanged} />
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
                <span className="flex items-center gap-1.5"><TagDot color={s.color ?? colorForTag(s.tag)} />{s.tag}</span>
                <span className="font-telemetry text-muted">{s.count}</span>
              </button>
            ))}
          {allowCreate && !loading && input.trim() && !exactMatch && (
            <button
              type="button"
              className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm text-accent hover:bg-surface-2"
              onClick={() => addTag(input)}
            >
              <TagDot color={colorForTag(provisional)} />
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
