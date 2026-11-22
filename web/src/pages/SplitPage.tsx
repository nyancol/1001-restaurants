import { useCallback, useMemo, useRef, useState } from "react";
import FilterBar from "../components/FilterBar";
import FeedHeader, { sortPlaces, type SortId } from "../components/FeedHeader";
import MapView from "../components/MapView";
import OwnerPicker from "../components/OwnerPicker";
import PlaceListPane from "../components/PlaceListPane";
import type { TagMutation } from "../components/TagCombobox";
import { usePlaceFilters } from "../lib/usePlaceFilters";
import { usePlaces } from "../lib/usePlaces";
import { displayNameFor, useUsers } from "../lib/useUsers";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * Desktop journal split (`lg:`+): filter rail, scrollable feed, sticky map.
 * Phone: stacked rail summary + feed; map lives on /map.
 */
export default function SplitPage({ onUnauthorized }: { onUnauthorized: () => void }) {
  const {
    owner,
    setOwner,
    statusParam,
    tagsParam,
    qParam,
    openAtParam,
    openNowParam,
    priceParam,
    status,
    setStatus,
    tags,
    setTags,
    q,
    setQ,
    openEnabled,
    setOpenEnabled,
    openAt,
    setOpenAt,
    price,
    setPrice,
  } = usePlaceFilters();
  const { me, users } = useUsers();
  const { t } = useLanguage();

  const {
    places,
    loading,
    error,
    setError,
    flipStatus,
    saveEdit,
    deleteOne,
    refreshOne,
    refreshingIds,
    fetchList,
  } = usePlaces(
    {
      owner,
      status: statusParam,
      tags: tagsParam,
      q: qParam,
      openAt: openAtParam,
      openNow: openNowParam,
      price: priceParam,
    },
    onUnauthorized,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [geoNote, setGeoNote] = useState<string | null>(null);
  const [sort, setSort] = useState<SortId>("recent");
  const listElRef = useRef<HTMLUListElement | null>(null);

  const handleTagDefinitionsChanged = useCallback(
    (m: TagMutation) => {
      if (m.type === "rename") {
        setTags(tags.map((tg) => (tg === m.oldName ? m.newName : tg)));
      } else if (m.type === "delete") {
        setTags(tags.filter((tg) => tg !== m.name));
      }
      void fetchList();
    },
    [tags, setTags, fetchList],
  );

  const locatedCount = places.filter((p) => p.lat != null && p.lng != null).length;
  const unlocatedCount = places.length - locatedCount;
  const wantCount = places.filter((p) => p.status === "WANT_TO_GO").length;
  const beenCount = places.filter((p) => p.status === "BEEN_TO").length;
  const readOnly = owner !== "me";
  const scopeName =
    owner === "me"
      ? t["scope.me"]
      : owner === "all"
        ? t["scope.everyone"]
        : (displayNameFor(owner, me, users) ?? t["scope.userFallback"]);
  const sorted = useMemo(() => sortPlaces(places, sort), [places, sort]);

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      requestAnimationFrame(() => {
        listElRef.current
          ?.querySelector(`[data-place-id="${CSS.escape(id)}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1600px] bg-bg px-4 pb-16 pt-4 lg:px-8">
      <p className="sr-only" aria-live="polite">
        {t["scope.locatedSummary"](places.length, locatedCount, unlocatedCount, readOnly)}
      </p>
      {geoNote && (
        <div className="edge radius-input mb-3 border-line bg-surface-2 px-3 py-2 text-xs text-muted">
          {geoNote}
        </div>
      )}
      <div className="gap-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        {/* Left rail */}
        <aside className="mb-4 lg:sticky lg:top-[76px] lg:mb-0 lg:max-h-[calc(100dvh-96px)] lg:overflow-y-auto lg:pr-1">
          <div
            className="edge radius-card border-line bg-surface p-3 shadow-theme lg:bg-transparent lg:p-0 lg:shadow-none lg:border-transparent"
            style={{ borderRadius: 16 }}
          >
            <div className="mb-4">
              <OwnerPicker owner={owner} setOwner={setOwner} />
            </div>
            <FilterBar
              status={status}
              setStatus={setStatus}
              tags={tags}
              setTags={setTags}
              q={q}
              setQ={setQ}
              openEnabled={openEnabled}
              setOpenEnabled={setOpenEnabled}
              openAt={openAt}
              setOpenAt={setOpenAt}
              price={price}
              setPrice={setPrice}
              layout="rail"
              statusCounts={{ all: places.length, want: wantCount, been: beenCount }}
            />
          </div>
        </aside>

        {/* Center feed */}
        <section aria-label={t["map.listAria"]} className="min-w-0">
          <FeedHeader total={places.length} sort={sort} setSort={setSort} />
          <p className="mb-2 text-xs text-muted">
            Viewing {scopeName} · {locatedCount} shown
            {unlocatedCount > 0 ? ` · ${unlocatedCount} hidden` : ""}
            {readOnly ? " · read-only" : ""}
          </p>
          <PlaceListPane
            places={sorted}
            loading={loading}
            error={error}
            onToggleStatus={(p) => void flipStatus(p)}
            onSaveEdit={saveEdit}
            onDeleteEdit={deleteOne}
            onRefresh={(p) => refreshOne(p)}
            refreshingIds={refreshingIds}
            onError={setError}
            focusedId={selectedId}
            onCardSelect={setSelectedId}
            listRef={(el) => {
              listElRef.current = el;
            }}
            readOnly={readOnly}
            onTagDefinitionsChanged={handleTagDefinitionsChanged}
            emptyTitle={readOnly ? t["empty.scopeHasNoPlaces"](scopeName) : undefined}
            emptySubtitle={readOnly ? t["empty.tryClear"] : undefined}
            emptyHint={
              <a
                href="/add"
                className="edge radius-input mt-3 inline-block border-accent bg-accent px-4 py-2 text-sm text-accent-ink"
              >
                {t["action.addPlace"]}
              </a>
            }
          />
        </section>

        {/* Right map */}
        <section
          aria-label={t["map.mapAria"]}
          className="mt-6 min-w-0 lg:sticky lg:top-[76px] lg:mt-0"
        >
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
            onSelect={handleSelect}
            onGeoNote={setGeoNote}
            mapHeightClass="h-[62dvh] min-h-[420px] lg:h-[calc(100dvh-8rem)] lg:min-h-[560px]"
            readOnly={readOnly}
            showDetails={false}
            showPreview={false}
            onTagDefinitionsChanged={handleTagDefinitionsChanged}
          />
          <p className="mt-2 text-[11px] text-muted">
            ©{" "}
            <a className="underline" href="https://www.openstreetmap.org/copyright">
              OpenStreetMap
            </a>{" "}
            contributors
          </p>
        </section>
      </div>
    </div>
  );
}
