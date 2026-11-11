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
    <div className="mx-auto max-w-xl bg-bg px-4 pb-16 pt-4">
      <h1 className="font-display mb-4 text-xl font-bold text-ink">My places</h1>
      <FilterBar status={status} setStatus={setStatus} tags={tags} setTags={setTags} q={q} setQ={setQ} />

      {loading && <div className="py-8 text-center text-sm text-muted">Loading…</div>}
      {error && (
        <div className="edge radius-input mb-3 border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</div>
      )}
      {!loading && !error && places.length === 0 && (
        <div className="edge radius-card border-dashed border-line bg-surface px-4 py-10 text-center">
          <p className="font-display font-medium text-ink">No places yet</p>
          <p className="mt-1 text-sm text-muted">Save your first spot from the Add page.</p>
          <a href="/add" className="edge radius-input mt-3 inline-block border-accent bg-accent px-4 py-2 text-sm text-accent-ink">
            Add a place
          </a>
        </div>
      )}
      <ul className="flex flex-col gap-3">
        {places.map((p) => (
          <li key={p.id} className="edge radius-card border-line bg-surface p-3 shadow-theme">
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
