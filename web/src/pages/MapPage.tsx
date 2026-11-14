import { useState } from "react";
import { Link } from "react-router-dom";
import FilterBar from "../components/FilterBar";
import MapView from "../components/MapView";
import OwnerPicker from "../components/OwnerPicker";
import ViewToggle from "../components/ViewToggle";
import { usePlaceFilters } from "../lib/usePlaceFilters";
import { usePlaces } from "../lib/usePlaces";
import { displayNameFor, useUsers } from "../lib/useUsers";
import { useLanguage } from "../i18n/LanguageContext";

export default function MapPage({ onUnauthorized }: { onUnauthorized: () => void }) {
  const { owner, setOwner, statusParam, tagsParam, qParam, placeTypeParam, openAtParam, openNowParam, status, setStatus, tags, setTags, q, setQ, placeType, setPlaceType, openEnabled, setOpenEnabled, openAt, setOpenAt } = usePlaceFilters();
  const { me, users } = useUsers();
  const { t } = useLanguage();

  const { places, loading, error, setError, flipStatus, saveEdit, deleteOne, refreshOne, refreshingIds } = usePlaces(
    { owner, status: statusParam, placeType: placeTypeParam, tags: tagsParam, q: qParam, openAt: openAtParam, openNow: openNowParam },
    onUnauthorized,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [geoNote, setGeoNote] = useState<string | null>(null);

  const locatedCount = places.filter((p) => p.lat != null && p.lng != null).length;
  const unlocatedCount = places.length - locatedCount;
  const readOnly = owner !== "me";
  const scopeName = owner === "me" ? t["scope.me"] : owner === "all" ? t["scope.everyone"] : (displayNameFor(owner, me, users) ?? t["scope.userFallback"]);

  return (
    <div className="mx-auto max-w-xl bg-bg px-4 pb-16 pt-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-xl font-bold text-ink">{t["scope.viewingMap"](scopeName)}</h1>
        {!loading && (
          <p className="text-xs text-muted" aria-live="polite">
            {t["scope.mapSummary"](locatedCount, unlocatedCount, readOnly)}
          </p>
        )}
      </div>
      <div className="mb-3">
        <OwnerPicker owner={owner} setOwner={setOwner} />
      </div>
      <FilterBar status={status} setStatus={setStatus} tags={tags} setTags={setTags} q={q} setQ={setQ} placeType={placeType} setPlaceType={setPlaceType} openEnabled={openEnabled} setOpenEnabled={setOpenEnabled} openAt={openAt} setOpenAt={setOpenAt} />
      {!readOnly && (
        <Link
          to="/add"
          className="edge radius-input mb-3 inline-flex min-h-[48px] w-full items-center justify-center border-accent bg-accent text-sm font-medium text-accent-ink"
        >
          {t["action.addPlacePlus"]}
        </Link>
      )}
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
      />
      <p className="mt-2 text-[11px] text-muted">
        © <a className="underline" href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
      </p>
    </div>
  );
}
