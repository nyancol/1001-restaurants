import { Link } from "react-router-dom";
import FilterBar from "../components/FilterBar";
import OwnerPicker from "../components/OwnerPicker";
import PlaceListPane from "../components/PlaceListPane";
import ViewToggle from "../components/ViewToggle";
import { usePlaceFilters } from "../lib/usePlaceFilters";
import { usePlaces } from "../lib/usePlaces";
import { useLanguage } from "../i18n/LanguageContext";
import { displayNameFor, useUsers } from "../lib/useUsers";

export default function ListPage({ onUnauthorized }: { onUnauthorized: () => void }) {
  const { owner, setOwner, statusParam, tagsParam, qParam, placeTypeParam, openAtParam, openNowParam, status, setStatus, tags, setTags, q, setQ, placeType, setPlaceType, openEnabled, setOpenEnabled, openAt, setOpenAt } = usePlaceFilters();
  const { me, users } = useUsers();
  const { t } = useLanguage();

  const { places, loading, error, setError, flipStatus, saveEdit, deleteOne, refreshOne, refreshingIds } = usePlaces(
    { owner, status: statusParam, placeType: placeTypeParam, tags: tagsParam, q: qParam, openAt: openAtParam, openNow: openNowParam },
    onUnauthorized,
  );

  const readOnly = owner !== "me";
  const scopeName = owner === "me" ? t["scope.me"] : owner === "all" ? t["scope.everyone"] : (displayNameFor(owner, me, users) ?? t["scope.userFallback"]);
  const emptyTitle = readOnly ? (places.length === 0 && !loading && !error ? t["empty.scopeHasNoPlaces"](scopeName) : t["empty.noPlaces"]) : t["empty.noPlaces"];

  return (
    <div className="mx-auto max-w-xl bg-bg px-4 pb-16 pt-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-xl font-bold text-ink">{t["scope.viewingList"](scopeName)}</h1>
        {!loading && !error && places.length > 0 && (
          <p className="text-xs text-muted" aria-live="polite">{t["scope.countPlaces"](places.length)}{readOnly ? ` · ${t["scope.readOnlySuffix"]}` : ""}</p>
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

      <PlaceListPane
        places={places}
        loading={loading}
        error={error}
        onToggleStatus={(p) => void flipStatus(p)}
        onSaveEdit={saveEdit}
        onDeleteEdit={deleteOne}
        onRefresh={(p) => refreshOne(p)}
        refreshingIds={refreshingIds}
        onError={setError}
        readOnly={readOnly}
        emptyTitle={readOnly ? (places.length === 0 ? t["empty.scopeHasNoPlaces"](scopeName) : t["empty.scopeHasNoPlacesFilter"](scopeName)) : emptyTitle}
        emptySubtitle={readOnly ? t["empty.tryClear"] : undefined}
        emptyHint={
          <a href="/add" className="edge radius-input mt-3 inline-block border-accent bg-accent px-4 py-2 text-sm text-accent-ink">
            {t["action.addPlace"]}
          </a>
        }
      />
    </div>
  );
}
