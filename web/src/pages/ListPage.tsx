import { useCallback, useMemo, useState } from "react";
import FilterBar from "../components/FilterBar";
import FeedHeader, { sortPlaces, type SortId, type ViewMode } from "../components/FeedHeader";
import OwnerPicker from "../components/OwnerPicker";
import PlaceListPane from "../components/PlaceListPane";
import type { TagMutation } from "../components/TagCombobox";
import ViewToggle from "../components/ViewToggle";
import { usePlaceFilters } from "../lib/usePlaceFilters";
import { usePlaces } from "../lib/usePlaces";
import { useLanguage } from "../i18n/LanguageContext";
import { displayNameFor, useUsers } from "../lib/useUsers";

export default function ListPage({ onUnauthorized }: { onUnauthorized: () => void }) {
  const { owner, setOwner, statusParam, tagsParam, qParam, openAtParam, openNowParam, status, setStatus, tags, setTags, q, setQ, openEnabled, setOpenEnabled, openAt, setOpenAt } = usePlaceFilters();
  const { me, users } = useUsers();
  const { t } = useLanguage();

  const { places, loading, error, setError, flipStatus, saveEdit, deleteOne, refreshOne, refreshingIds, fetchList } = usePlaces(
    { owner, status: statusParam, tags: tagsParam, q: qParam, openAt: openAtParam, openNow: openNowParam },
    onUnauthorized,
  );

  const [sort, setSort] = useState<SortId>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const sorted = useMemo(() => sortPlaces(places, sort), [places, sort]);
  const wantCount = places.filter((p) => p.status === "WANT_TO_GO").length;
  const beenCount = places.filter((p) => p.status === "BEEN_TO").length;

  const handleTagDefinitionsChanged = useCallback((m: TagMutation) => {
    if (m.type === "rename") {
      setTags(tags.map((tg) => (tg === m.oldName ? m.newName : tg)));
    } else if (m.type === "delete") {
      setTags(tags.filter((tg) => tg !== m.name));
    }
    void fetchList();
  }, [tags, setTags, fetchList]);

  const readOnly = owner !== "me";
  const scopeName = owner === "me" ? t["scope.me"] : owner === "all" ? t["scope.everyone"] : (displayNameFor(owner, me, users) ?? t["scope.userFallback"]);
  const emptyTitle = readOnly ? (places.length === 0 && !loading && !error ? t["empty.scopeHasNoPlaces"](scopeName) : t["empty.noPlaces"]) : t["empty.noPlaces"];

  return (
    <div className="mx-auto max-w-xl bg-bg px-4 pb-16 pt-4 lg:max-w-[1600px]">
      <FeedHeader total={places.length} sort={sort} setSort={setSort} viewMode={viewMode} setViewMode={setViewMode} />
      <p className="mb-2 text-xs text-muted">Viewing {scopeName}{readOnly ? " · read-only" : ""}</p>
      <div className="mb-3">
        <OwnerPicker owner={owner} setOwner={setOwner} />
      </div>
      <FilterBar
        status={status} setStatus={setStatus} tags={tags} setTags={setTags} q={q} setQ={setQ}
        openEnabled={openEnabled} setOpenEnabled={setOpenEnabled} openAt={openAt} setOpenAt={setOpenAt}
        statusCounts={{ all: places.length, want: wantCount, been: beenCount }}
      />
      <div className="mb-4">
        <ViewToggle />
      </div>

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
        readOnly={readOnly}
        onTagDefinitionsChanged={handleTagDefinitionsChanged}
        viewMode={viewMode}
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
