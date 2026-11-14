import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import FilterBar from "../components/FilterBar";
import MapView from "../components/MapView";
import OwnerPicker from "../components/OwnerPicker";
import PlaceListPane from "../components/PlaceListPane";
import { usePlaceFilters } from "../lib/usePlaceFilters";
import { usePlaces } from "../lib/usePlaces";
import { displayNameFor, useUsers } from "../lib/useUsers";

/**
 * Desktop split view (`lg:`+): permanent filter rail, scrollable list pane,
 * sticky map pane. One `usePlaceFilters` writer and one `usePlaces` fetch
 * feed both panes; selection syncs both ways.
 */
export default function SplitPage({ onUnauthorized }: { onUnauthorized: () => void }) {
  const { owner, setOwner, statusParam, tagsParam, qParam, placeTypeParam, openAtParam, openNowParam, status, setStatus, tags, setTags, q, setQ, placeType, setPlaceType, openEnabled, setOpenEnabled, openAt, setOpenAt } = usePlaceFilters();
  const { me, users } = useUsers();

  const { places, loading, error, setError, flipStatus, saveEdit, refreshOne, refreshingIds } = usePlaces(
    { owner, status: statusParam, placeType: placeTypeParam, tags: tagsParam, q: qParam, openAt: openAtParam, openNow: openNowParam },
    onUnauthorized,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [geoNote, setGeoNote] = useState<string | null>(null);
  const listElRef = useRef<HTMLUListElement | null>(null);

  const locatedCount = places.filter((p) => p.lat != null && p.lng != null).length;
  const unlocatedCount = places.length - locatedCount;
  const readOnly = owner !== "me";
  const scopeName = owner === "me" ? "Me" : owner === "all" ? "Everyone" : (displayNameFor(owner, me, users) ?? "User");

  // Pin tap → highlight + scroll the matching card into view.
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
    <div className="mx-auto w-full max-w-[1600px] bg-bg px-4 pb-16 pt-4 lg:px-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-xl font-bold text-ink">Places · Viewing {scopeName}</h1>
        {!loading && (
          <p className="text-xs text-muted" aria-live="polite">
            {places.length} place{places.length === 1 ? "" : "s"} · {locatedCount} shown
            {unlocatedCount > 0 ? ` · ${unlocatedCount} without location hidden` : ""}
            {readOnly ? " · read-only" : ""}
          </p>
        )}
      </div>
      {geoNote && (
        <div className="edge radius-input mb-3 border-line bg-surface-2 px-3 py-2 text-xs text-muted">{geoNote}</div>
      )}
      <div className="flex items-start gap-4">
        <aside className="sticky top-16 hidden w-72 shrink-0 self-start lg:block xl:w-80">
          <div className="mb-3">
            <OwnerPicker owner={owner} setOwner={setOwner} />
          </div>
          <FilterBar
            status={status} setStatus={setStatus}
            tags={tags} setTags={setTags}
            q={q} setQ={setQ}
            placeType={placeType} setPlaceType={setPlaceType}
            openEnabled={openEnabled} setOpenEnabled={setOpenEnabled}
            openAt={openAt} setOpenAt={setOpenAt}
            layout="rail"
          />
        </aside>
        <section aria-label="places list" className="min-w-0 flex-1">
          {!readOnly && (
            <Link
              to="/add"
              className="edge radius-input mb-4 inline-flex min-h-[44px] w-full items-center justify-center border-accent bg-accent text-sm font-medium text-accent-ink lg:min-h-9"
            >
              + Add a place
            </Link>
          )}
          <PlaceListPane
            places={places}
            loading={loading}
            error={error}
            onToggleStatus={(p) => void flipStatus(p)}
            onSaveEdit={saveEdit}
            onRefresh={(p) => refreshOne(p)}
            refreshingIds={refreshingIds}
            onError={setError}
            focusedId={selectedId}
            onCardSelect={setSelectedId}
            listRef={(el) => { listElRef.current = el; }}
            readOnly={readOnly}
            emptyTitle={readOnly ? `${scopeName} has no places` : undefined}
            emptySubtitle={readOnly ? "Try clearing filters or viewing another user." : undefined}
            emptyHint={
              <a href="/add" className="edge radius-input mt-3 inline-block border-accent bg-accent px-4 py-2 text-sm text-accent-ink">
                Add a place
              </a>
            }
          />
        </section>
        <section aria-label="places map" className="sticky top-16 hidden min-w-0 flex-[1.2] lg:block">
          <MapView
            places={places}
            loading={loading}
            onError={setError}
            onFlipStatus={(p) => void flipStatus(p)}
            onSaveEdit={saveEdit}
            onRefresh={(p) => refreshOne(p)}
            refreshingIds={refreshingIds}
            selectedId={selectedId}
            onSelect={handleSelect}
            onGeoNote={setGeoNote}
            mapHeightClass="h-[calc(100dvh-8rem)] min-h-[480px]"
            readOnly={readOnly}
          />
          <p className="mt-2 text-[11px] text-muted">
            © <a className="underline" href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
          </p>
        </section>
      </div>
    </div>
  );
}
