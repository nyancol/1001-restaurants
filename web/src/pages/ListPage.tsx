import { useCallback, useEffect, useState } from "react";
import FilterBar from "../components/FilterBar";
import PlaceCard from "../components/PlaceCard";
import PlaceEditor from "../components/PlaceEditor";
import { listPlaces, patchPlace, UnauthorizedError, type Place } from "../lib/api";
import { usePlaceFilters } from "../lib/usePlaceFilters";

export default function ListPage({ onUnauthorized }: { onUnauthorized: () => void }) {
  const { statusParam, tagsParam, qParam, status, setStatus, tags, setTags, q, setQ } = usePlaceFilters();

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPlaces({
        owner: "me",
        status: statusParam || undefined,
        tags: tagsParam || undefined,
        q: qParam || undefined,
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
  }, [onUnauthorized, statusParam, tagsParam, qParam]);

  // Refetch when URL query changes (debounced q + status/tags immediate).
  useEffect(() => {
    void fetchList();
  }, [fetchList]);

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

  async function saveEdit(p: Place, patch: { tags: string[]; rating: number | null; note: string | null }) {
    const prev = [...places];
    const optimistic: Place = { ...p, ...patch };
    setPlaces(places.map((x) => (x.id === p.id ? optimistic : x)));
    setEditingId(null);
    try {
      const updated = await patchPlace(p.id, patch);
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
      <FilterBar status={status} setStatus={setStatus} tags={tags} setTags={setTags} q={q} setQ={setQ} />

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
            <PlaceCard place={p} onToggleStatus={flipStatus} onEdit={(pl) => setEditingId(pl.id)} />
            {editingId === p.id && (
              <PlaceEditor place={p} onSave={(patch) => saveEdit(p, patch)} onCancel={() => setEditingId(null)} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
