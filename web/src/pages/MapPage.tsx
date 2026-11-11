import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoJSONSource, LngLatBounds, Map as MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import FilterBar from "../components/FilterBar";
import PlaceCard from "../components/PlaceCard";
import PlaceEditor from "../components/PlaceEditor";
import { listPlaces, patchPlace, UnauthorizedError, type Place } from "../lib/api";
import { usePlaceFilters } from "../lib/usePlaceFilters";
import { ensurePinImages } from "../theme/pins";
import { useTheme } from "../theme/ThemeContext";

const PARIS = { lng: 2.3522, lat: 48.8566, zoom: 11.5 };

const DEFAULT_TILES = [
  "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
  "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
  "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
];
const TILE_URLS =
  import.meta.env.VITE_MAP_TILE_URL?.split(",").map((s: string) => s.trim()).filter(Boolean) ??
  DEFAULT_TILES;
const ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function toGeoJSON(places: Place[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: places
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng as number, p.lat as number] },
        properties: { id: p.id, status: p.status },
      })),
  };
}

export default function MapPage({ onUnauthorized }: { onUnauthorized: () => void }) {
  const { statusParam, tagsParam, qParam, status, setStatus, tags, setTags, q, setQ } = usePlaceFilters();
  const { mode } = useTheme();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

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

  const located = useMemo(() => places.filter((p) => p.lat != null && p.lng != null), [places]);
  const unlocatedCount = places.length - located.length;
  const selected = selectedId ? (places.find((p) => p.id === selectedId) ?? null) : null;

  // Init map once. Sticky viewport lives here — nothing else moves it.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    setWorkerUrl("/maplibre-gl-worker.mjs");
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            osm: { type: "raster", tiles: TILE_URLS, tileSize: 256, attribution: ATTRIBUTION, maxzoom: 19 },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center: [PARIS.lng, PARIS.lat],
        zoom: PARIS.zoom,
      });
    } catch (err: any) {
      setError(`Map failed to start: ${err?.message ?? err} — this browser may lack WebGL2.`);
      return;
    }
    map.addControl(new NavigationControl(), "top-right");
    map.on("error", (e: any) => {
      const msg = e?.error?.message ?? "map error";
      setError(`Map error: ${msg} — check connection/tiles, then reload.`);
    });
    mapRef.current = map;

    map.on("load", () => {
      void (async () => {
        try {
          const currentMode = document.documentElement.dataset.mode ?? "light";
          await ensurePinImages(map, currentMode);
          map.addSource("places", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50,
          });
          map.addLayer({
            id: "clusters",
            type: "circle",
            source: "places",
            filter: ["has", "point_count"],
            paint: {
              "circle-color": "#111827",
              "circle-opacity": 0.85,
              "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 30, 28],
            },
          });
          map.addLayer({
            id: "cluster-count",
            type: "symbol",
            source: "places",
            filter: ["has", "point_count"],
            layout: { "text-field": "{point_count_abbreviated}", "text-size": 12 },
            paint: { "text-color": "#ffffff" },
          });
          // Selection halo under pins (basemap stays light in all themes).
          map.addLayer({
            id: "pins-selected",
            type: "circle",
            source: "places",
            filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "id"], ""]],
            paint: {
              "circle-color": "#000000",
              "circle-radius": 16,
              "circle-opacity": 0.25,
            },
          });
          // Tip-anchored drops; fill stays semantic by status in all themes.
          map.addLayer({
            id: "pins",
            type: "symbol",
            source: "places",
            filter: ["!", ["has", "point_count"]],
            layout: {
              "icon-image": ["match", ["get", "status"], "BEEN_TO", "drop-BEEN_TO", "drop-WANT_TO_GO"],
              "icon-anchor": "bottom",
              "icon-size": 1,
              "icon-allow-overlap": true,
            },
          });

          map.on("click", "clusters", (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
            const clusterId = features[0]?.properties?.cluster_id;
            if (clusterId == null) return;
            (map.getSource("places") as GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err || zoom == null) return;
              map.easeTo({ center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number], zoom });
            });
          });
          map.on("click", "pins", (e) => {
            const id = (e.features?.[0]?.properties as any)?.id as string | undefined;
            if (id) {
              setSelectedId(id);
              setEditing(false);
            }
          });
          map.on("click", (e) => {
            const hits = map.queryRenderedFeatures(e.point, { layers: ["pins", "clusters"] });
            if (!hits.length) {
              setSelectedId(null);
              setEditing(false);
            }
          });
          map.on("mouseenter", "pins", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "pins", () => {
            map.getCanvas().style.cursor = "";
          });
          map.on("mouseenter", "clusters", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "clusters", () => {
            map.getCanvas().style.cursor = "";
          });

          setMapReady(true);
        } catch (err: any) {
          setError(`Map setup failed: ${err?.message ?? err} — reload to retry.`);
        }
      })();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Push pin data without touching the viewport.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const source = map.getSource("places") as GeoJSONSource | undefined;
    if (!source) return;
    const fc = toGeoJSON(places);
    source.setData(fc);
    // eslint-disable-next-line no-console
    console.info(`[map] pushed ${fc.features.length} pins`);
  }, [places, mapReady]);

  // Ensure drop images exist for current mode (fills stay semantic).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    void ensurePinImages(map, mode);
  }, [mode, mapReady]);

  // Highlight selection halo.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!map.getLayer("pins-selected")) return;
    map.setFilter("pins-selected", ["all", ["!", ["has", "point_count"]], ["==", ["get", "id"], selectedId ?? ""]]);
  }, [selectedId, mapReady]);

  function fitToResults() {
    const map = mapRef.current;
    if (!map || !located.length) return;
    const bounds = new LngLatBounds();
    for (const p of located) bounds.extend([p.lng as number, p.lat as number]);
    map.fitBounds(bounds, {
      padding: { top: 60, bottom: selected ? 260 : 60, left: 40, right: 40 },
      maxZoom: 15,
    });
  }

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
    setPlaces(places.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
    setEditing(false);
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
      <div className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink">Map</h1>
        <button
          type="button"
          onClick={fitToResults}
          disabled={!located.length}
          className="edge radius-input border-line bg-surface px-2 py-1.5 text-sm text-ink disabled:opacity-40"
        >
          Fit to results
        </button>
      </div>
      <FilterBar status={status} setStatus={setStatus} tags={tags} setTags={setTags} q={q} setQ={setQ} />

      {error && <div className="edge radius-input mb-3 border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</div>}
      {!loading && unlocatedCount > 0 && (
        <div className="edge radius-input mb-3 border-line bg-surface-2 px-3 py-2 text-xs text-muted">
          {unlocatedCount} place{unlocatedCount > 1 ? "s" : ""} without location hidden from the map.
        </div>
      )}

      <div className="edge radius-card relative overflow-hidden border-line">
        <div ref={containerRef} className="maplibre-themed h-[60dvh] min-h-96 w-full" aria-label="places map" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/70 text-sm text-muted">Loading…</div>
        )}
        {selected && (
          <div className="radius-card absolute inset-x-0 bottom-0 max-h-[55%] overflow-y-auto border-t border-line bg-surface p-3 shadow-theme">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                aria-label="close details"
                className="edge radius-input border-line bg-surface px-2 py-0.5 text-xs text-ink"
                onClick={() => {
                  setSelectedId(null);
                  setEditing(false);
                }}
              >
                Close
              </button>
            </div>
            <PlaceCard place={selected} onToggleStatus={flipStatus} onEdit={() => setEditing(true)} />
            {editing && <PlaceEditor place={selected} onSave={(patch) => saveEdit(selected, patch)} onCancel={() => setEditing(false)} />}
          </div>
        )}
      </div>
      <p className="mt-2 text-[11px] text-muted">
        © <a className="underline" href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
      </p>
    </div>
  );
}
