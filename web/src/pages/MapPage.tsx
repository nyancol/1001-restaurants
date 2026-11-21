import { useEffect, useMemo, useState } from "react";
import MapView from "../components/MapView";
import ViewToggle from "../components/ViewToggle";
import SearchBar from "../components/mobile/SearchBar";
import FilterSheet from "../components/mobile/FilterSheet";
import PhoneMapPreview from "../components/mobile/PhoneMapPreview";
import TastingNotesSheet from "../components/mobile/TastingNotesSheet";
import EditPlaceSheet from "../components/mobile/EditPlaceSheet";
import AddPlaceSheet from "../components/mobile/AddPlaceSheet";
import type { TagMutation } from "../components/TagCombobox";
import { usePlaceFilters } from "../lib/usePlaceFilters";
import { usePlaces } from "../lib/usePlaces";

function priceTiersFor(level: unknown): string[] {
  const v = String(level ?? "").toUpperCase();
  if (v.includes("INEXPENSIVE")) return ["$"];
  if (v.includes("MODERATE")) return ["$$"];
  if (v.includes("EXPENSIVE") && v.includes("VERY")) return ["$$$$"];
  if (v.includes("EXPENSIVE")) return ["$$$"];
  const m = String(level ?? "").match(/\$+/);
  return m ? [m[0]] : [];
}

export default function MapPage({ onUnauthorized }: { onUnauthorized: () => void }) {
  const { owner, statusParam, tagsParam, qParam, openAtParam, openNowParam, priceParam, status, setStatus, tags, setTags, q, setQ, openEnabled, setOpenEnabled, openAt, setOpenAt, price, setPrice } = usePlaceFilters();

  const { places, loading, error, setError, flipStatus, saveEdit, deleteOne, refreshOne, refreshingIds, fetchList } = usePlaces(
    { owner, status: statusParam, tags: tagsParam, q: qParam, openAt: openAtParam, openNow: openNowParam, price: priceParam },
    onUnauthorized,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notesPlace, setNotesPlace] = useState<(typeof places)[number] | null>(null);
  const [editingPlace, setEditingPlace] = useState<(typeof places)[number] | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const onOpenAdd = () => setAddOpen(true);
    window.addEventListener("inmybelly:open-add", onOpenAdd);
    return () => window.removeEventListener("inmybelly:open-add", onOpenAdd);
  }, []);

  const priceSelected = price ? price.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const filtered = useMemo(() => {
    if (!priceSelected.length) return places;
    return places.filter((p) => {
      const tiers = priceTiersFor((p as { priceLevel?: unknown }).priceLevel);
      return tiers.some((t) => priceSelected.includes(t));
    });
  }, [places, price]);

  const handleTagDefinitionsChanged = (m: TagMutation) => {
    if (m.type === "rename") {
      setTags(tags.map((tg) => (tg === m.oldName ? m.newName : tg)));
    } else if (m.type === "delete") {
      setTags(tags.filter((tg) => tg !== m.name));
    }
    void fetchList();
  };

  const wantCount = places.filter((p) => p.status === "WANT_TO_GO").length;
  const beenCount = places.filter((p) => p.status === "BEEN_TO").length;
  const activeFilterCount = tags.length + (openEnabled ? 1 : 0) + priceSelected.length + (status ? 1 : 0);
  const selected = selectedId ? (filtered.find((p) => p.id === selectedId) ?? null) : (filtered[0] ?? null);

  return (
    <div className="mx-auto w-full max-w-md bg-bg px-4 pb-8 pt-3">
      <SearchBar q={q} setQ={setQ} onOpenFilters={() => setSheetOpen(true)} activeFilterCount={activeFilterCount} />

      <div className="flex items-center justify-between pb-1 pt-3">
        <div className="flex items-baseline gap-1.5">
          <h1 className="font-display text-xl font-bold text-ink">Saved Tables</h1>
          <span className="text-xs font-medium text-muted">({filtered.length})</span>
        </div>
        <ViewToggle />
      </div>

      {error && <div className="edge radius-input mb-3 border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</div>}

      <div className="edge relative overflow-hidden border-line bg-surface-2/30" style={{ borderRadius: 16 }}>
        <MapView
          places={filtered}
          loading={loading}
          onError={setError}
          onFlipStatus={(p) => void flipStatus(p)}
          onSaveEdit={saveEdit}
          onDelete={deleteOne}
          onRefresh={(p) => refreshOne(p)}
          refreshingIds={refreshingIds}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          readOnly={false}
          mapHeightClass="h-[62dvh] min-h-[420px]"
          showDetails={false}
          onTagDefinitionsChanged={handleTagDefinitionsChanged}
        />

        {selected && !notesPlace && !editingPlace && (
          <div className="absolute inset-x-3 bottom-3">
            <PhoneMapPreview
              place={selected}
              onClose={() => setSelectedId(null)}
              onViewNotes={(p) => setNotesPlace(p)}
            />
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted">© 2024 In my Belly • Paris</p>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        tags={tags}
        setTags={setTags}
        openEnabled={openEnabled}
        setOpenEnabled={setOpenEnabled}
        openAt={openAt}
        setOpenAt={setOpenAt}
        price={price}
        setPrice={setPrice}
        status={status}
        setStatus={setStatus}
        counts={{ all: places.length, want: wantCount, been: beenCount }}
        resultCount={filtered.length}
      />

      <TastingNotesSheet
        place={notesPlace}
        onClose={() => setNotesPlace(null)}
        onEdit={(p) => {
          setNotesPlace(null);
          setEditingPlace(p);
        }}
        onToggleStatus={(p) => void flipStatus(p)}
      />

      <EditPlaceSheet
        place={editingPlace}
        onClose={() => setEditingPlace(null)}
        onSave={async (p, patch) => {
          await saveEdit(p, patch);
        }}
        onDelete={async (p) => {
          await deleteOne(p);
          if (selectedId === p.id) setSelectedId(null);
        }}
        onTagDefinitionsChanged={handleTagDefinitionsChanged}
      />

      <AddPlaceSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => void fetchList()}
        onUnauthorized={onUnauthorized}
        onTagDefinitionsChanged={handleTagDefinitionsChanged}
      />
    </div>
  );
}
