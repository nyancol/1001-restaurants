import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import TagCombobox from "../components/TagCombobox";
import Stars from "../components/Stars";
import { listPlaces, patchPlace, UnauthorizedError, type Place } from "../lib/api";

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function ListPage({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get("status") ?? "";
  const tagsParam = searchParams.get("tags") ?? "";
  const qParam = searchParams.get("q") ?? "";

  const [status, setStatus] = useState(statusParam);
  const [tags, setTags] = useState<string[]>(tagsParam ? tagsParam.split(",").filter(Boolean) : []);
  const [q, setQ] = useState(qParam);

  const debouncedQ = useDebouncedValue(q, 300);

  // Sync state → URL.
  useEffect(() => {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (tags.length) next.set("tags", tags.join(","));
    if (debouncedQ.trim()) next.set("q", debouncedQ.trim());
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, tags, debouncedQ]);

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editRating, setEditRating] = useState<number | null>(null);
  const [editNote, setEditNote] = useState("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams(window.location.search);
      const data = await listPlaces({
        owner: "me",
        status: sp.get("status") ?? undefined,
        tags: sp.get("tags") ?? undefined,
        q: sp.get("q") ?? undefined,
      });
      setPlaces(data);
    } catch (err: any) {
      if (err instanceof UnauthorizedError) {
        onUnauthorized();
        return;
      }
      setError(err?.message ?? "Failed to load places.");
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  // Refetch when URL query changes (debounced q + status/tags immediate).
  useEffect(() => {
    void fetchList();
  }, [statusParam, tagsParam, qParam, fetchList]);

  async function flipStatus(p: Place) {
    const next = p.status === "WANT_TO_GO" ? "BEEN_TO" : "WANT_TO_GO";
    const prev = [...places];
    setPlaces(places.map((x) => (x.id === p.id ? { ...x, status: next } : x)));
    try {
      const updated = await patchPlace(p.id, { status: next });
      setPlaces((cur) => cur.map((x) => (x.id === p.id ? updated : x)));
    } catch (err: any) {
      if (err instanceof UnauthorizedError) {
        onUnauthorized();
        return;
      }
      setPlaces(prev);
      setError(err?.message ?? "Update failed — rolled back.");
    }
  }

  function startEdit(p: Place) {
    setEditingId(p.id);
    setEditTags(p.tags);
    setEditRating(p.rating);
    setEditNote(p.note ?? "");
  }

  async function saveEdit(p: Place) {
    const prev = [...places];
    const optimistic: Place = { ...p, tags: editTags, rating: editRating, note: editNote || null };
    setPlaces(places.map((x) => (x.id === p.id ? optimistic : x)));
    setEditingId(null);
    try {
      const updated = await patchPlace(p.id, { tags: editTags, rating: editRating, note: editNote || null });
      setPlaces((cur) => cur.map((x) => (x.id === p.id ? updated : x)));
    } catch (err: any) {
      if (err instanceof UnauthorizedError) {
        onUnauthorized();
        return;
      }
      setPlaces(prev);
      setError(err?.message ?? "Update failed — rolled back.");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-16 pt-4">
      <h1 className="mb-4 text-xl font-bold">My places</h1>
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            aria-label="status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded border px-2 py-1.5 text-sm"
          >
            <option value="">All statuses</option>
            <option value="WANT_TO_GO">Want to go</option>
            <option value="BEEN_TO">Been to</option>
          </select>
          <input
            aria-label="text search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name…"
            className="flex-1 rounded border px-3 py-1.5 text-sm"
          />
          {(status || tags.length || q) && (
            <button
              type="button"
              className="rounded border px-2 py-1.5 text-sm"
              onClick={() => {
                setStatus("");
                setTags([]);
                setQ("");
              }}
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-black px-2 py-0.5 text-xs text-white">
              {t}
              <button type="button" aria-label={`remove filter ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))}>
                ×
              </button>
            </span>
          ))}
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-600">Filter by tags</summary>
          <div className="mt-2">
            <TagCombobox
              value={tags}
              onChange={(next) => {
                // TagCombobox appends; for filters we replace wholesale.
                setTags(next);
              }}
            />
          </div>
        </details>
      </div>

      {loading && <div className="py-8 text-center text-sm text-slate-500">Loading…</div>}
      {error && <div className="mb-3 rounded bg-red-100 px-3 py-2 text-sm text-red-800">{error}</div>}
      {!loading && !error && places.length === 0 && (
        <div className="rounded border border-dashed px-4 py-10 text-center">
          <p className="font-medium">No places yet</p>
          <p className="mt-1 text-sm text-slate-500">Save your first spot from the Add page.</p>
          <a href="/add" className="mt-3 inline-block rounded bg-black px-4 py-2 text-sm text-white">
            Add a place
          </a>
        </div>
      )}
      <ul className="flex flex-col gap-3">
        {places.map((p) => (
          <li key={p.id} className="rounded border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{p.name}</div>
                {p.address && <div className="text-sm text-slate-500">{p.address}</div>}
                <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
                  <span className={`rounded-full px-2 py-0.5 ${p.status === "BEEN_TO" ? "bg-green-200" : "bg-amber-200"}`}>
                    {p.status === "BEEN_TO" ? "Been to" : "Want to go"}
                  </span>
                  {p.tags.map((t) => (
                    <span key={t} className="rounded-full bg-slate-200 px-2 py-0.5">
                      {t}
                    </span>
                  ))}
                  {p.rating != null && <span className="text-amber-600">{"★".repeat(p.rating)}</span>}
                </div>
                {p.note && <div className="mt-1 text-sm">{p.note}</div>}
              </div>
              <button
                type="button"
                onClick={() => flipStatus(p)}
                className="shrink-0 rounded border px-2 py-1 text-xs"
                aria-label={p.status === "WANT_TO_GO" ? "mark visited" : "mark want to go"}
              >
                {p.status === "WANT_TO_GO" ? "✓ visited" : "↩ want"}
              </button>
            </div>
            {editingId === p.id ? (
              <div className="mt-3 flex flex-col gap-2 border-t pt-3">
                <TagCombobox value={editTags} onChange={setEditTags} />
                <Stars value={editRating} onChange={setEditRating} />
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  rows={2}
                  placeholder="Note"
                />
                <div className="flex gap-2">
                  <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded bg-black px-3 py-1.5 text-sm text-white"
                    onClick={() => saveEdit(p)}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="mt-2 text-sm text-slate-600 underline"
                onClick={() => startEdit(p)}
              >
                Edit tags / stars / note
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
