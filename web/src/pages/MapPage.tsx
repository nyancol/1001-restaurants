import { useCallback, useState } from "react";
import FilterBar from "../components/FilterBar";
import MapView from "../components/MapView";
import type { TagMutation } from "../components/TagCombobox";
import OwnerPicker from "../components/OwnerPicker";
import ViewToggle from "../components/ViewToggle";
import { usePlaceFilters } from "../lib/usePlaceFilters";
import { usePlaces } from "../lib/usePlaces";
import { displayNameFor, useUsers } from "../lib/useUsers";
import { useLanguage } from "../i18n/LanguageContext";

export default function MapPage({ onUnauthorized }: { onUnauthorized: () => void }) {
  const { owner, setOwner, statusParam, tagsParam, qParam, openAtParam, openNowParam, priceParam, status, setStatus, tags, setTags, q, setQ, openEnabled, setOpenEnabled, openAt, setOpenAt, price, setPrice } = usePlaceFilters();
  const { me, users } = useUsers();
  const { t } = useLanguage();

  const { places, loading, error, setError, flipStatus, saveEdit, deleteOne, refreshOne, refreshingIds, fetchList } = usePlaces(
    { owner, status: statusParam, tags: tagsParam, q: qParam, openAt: openAtParam, openNow: openNowParam, price: priceParam },
    onUnauthorized,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [geoNote, setGeoNote] = useState<string | null>(null);

  const locatedCount = places.filter((p) => p.lat != null && p.lng != null).length;
  const unlocatedCount = places.length - locatedCount;
  const readOnly = owner !== "me";
  const scopeName = owner === "me" ? t["scope.me"] : owner === "all" ? t["scope.everyone"] : (displayNameFor(owner, me, users) ?? t["scope.userFallback"]);

  const handleTagDefinitionsChanged = useCallback((m: TagMutation) => {
    if (m.type === "rename") {
      setTags(tags.map((tg) => (tg === m.oldName ? m.newName : tg)));
    } else if (m.type === "delete") {
      setTags(tags.filter((tg) => tg !== m.name));
    }
    void fetchList();
  }, [tags, setTags, fetchList]);

  const wantCount = places.filter((p) => p.status === "WANT_TO_GO").length;
  const beenCount = places.filter((p) => p.status === "BEEN_TO").length;

  return (
    <div className="mx-auto w-full max-w-xl overflow-x-hidden bg-bg px-4 pb-16 pt-4">
      <div className="edge radius-card mb-3 flex flex-wrap items-center gap-2 border-line bg-surface p-3 shadow-theme" style={{ borderRadius: 16 }}>
        <h1 className="font-display mr-auto text-xl font-semibold text-ink">Saved Tables <span className="text-xs font-normal text-muted">({places.length})</span></h1>
        {!loading && (
          <p className="text-xs text-muted" aria-live="polite">
            {t["scope.mapSummary"](locatedCount, unlocatedCount, readOnly)}
          </p>
        )}
      </div>
      <div className="mb-3">
        <OwnerPicker owner={owner} setOwner={setOwner} />
      </div>
      <FilterBar status={status} setStatus={setStatus} tags={tags} setTags={setTags} q={q} setQ={setQ} openEnabled={openEnabled} setOpenEnabled={setOpenEnabled} openAt={openAt} setOpenAt={setOpenAt}
              price={price} setPrice={setPrice} statusCounts={{ all: places.length, want: wantCount, been: beenCount }} />
      <div className="mb-4">
        <ViewToggle />
      </div>

      {error && <div className="edge radius-input mb-3 border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</div>}
      {geoNote && (
        <div className="edge radius-input mb-3 border-line bg-surface-2 px-3 py-2 text-xs text-muted">{geoNote}</div>
      )}
      {!loading && unlocatedCount > 0 && (
        <div className="edge radius-input mb-3 border-line bg-surface-2 px-3 py-2 text-xs text-muted">
          {t["map.unlocatedHidden"](unlocatedCount)}
        </div>
      )}

      <MapView
        places={places}
        loading={loading}
        onError={setError}
        onFlipStatus={(p) => void flipStatus(p)}
        onSaveEdit={saveEdit}
        onDelete={deleteOne}
        onRefresh={(p) => refreshOne(p)}
        refreshingIds={refreshingIds}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onGeoNote={setGeoNote}
        readOnly={readOnly}
        mapHeightClass="h-[62dvh] min-h-[420px]"
        onTagDefinitionsChanged={handleTagDefinitionsChanged}
      />
      <p className="mt-2 text-[11px] text-muted">
        © <a className="underline" href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
      </p>
    </div>
  );
}
