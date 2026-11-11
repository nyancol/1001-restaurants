import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoJSONSource, LngLatBounds, Map as MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import PlaceCard from "./PlaceCard";
import PlaceEditor from "./PlaceEditor";
import type { Place } from "../lib/api";
import { ensurePinImages } from "../theme/pins";
import { useTheme } from "../theme/ThemeContext";
import { useMediaQuery } from "../lib/useMediaQuery";

const PARIS = { lng: 2.3522, lat: 48.8566, zoom: 11.5 };
const USER_ZOOM = 14;
const GEO_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 };
const USER_DOT = "#2E7CF6";
const GEO_FALLBACK_NOTE = "Location unavailable — showing Paris.";
const GEO_STAY_NOTE = "Location unavailable — staying put.";

type UserPos = { lng: number; lat: number; accuracy: number };

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
        properties: { id: p.id, status: p.status, placeType: (p.placeType ?? "restaurant").toLowerCase() },
      })),
  };
}

function getOneShotPosition(): Promise<GeolocationPosition> {
  if (!("geolocation" in navigator)) {
    return Promise.reject(new Error("geolocation unsupported"));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, GEO_OPTIONS);
  });
}

function accuracyToPixels(accuracyMeters: number, lat: number, zoom: number): number {
  if (!accuracyMeters || !Number.isFinite(accuracyMeters) || accuracyMeters <= 0) return 20;
  const metersPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  const px = accuracyMeters / Math.max(metersPerPixel, 0.01);
  return Math.min(60, Math.max(10, px));
}

function emptyUserCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

interface MapViewProps {
  places: Place[];
  loading: boolean;
  onError: (msg: string) => void;
  onFlipStatus: (p: Place) => void;
  onSaveEdit: (p: Place, patch: { tags: string[]; rating: number | null; note: string | null; placeType: string }) => Promise<void>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onGeoNote?: (note: string | null) => void;
  mapHeightClass?: string;
  readOnly?: boolean;
}

/**
 * MapLibre map with pins, clusters, user dot, and detail surface.
 * Shared by the phone Map page and the desktop split pane. The detail
 * surface is a bottom sheet on phone and a right-docked panel on desktop
 * via responsive classes; `fitToResults` biases padding accordingly.
 */
export default function MapView({
  places,
  loading,
  onError,
  onFlipStatus,
  onSaveEdit,
  selectedId,
  onSelect,
  onGeoNote,
  mapHeightClass = "h-[60dvh] min-h-96",
  readOnly,
}: MapViewProps) {
  const { mode } = useTheme();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userPos, setUserPos] = useState<UserPos | null>(null);

  const mapReadyRef = useRef(false);
  const locatingRef = useRef(false);
  const autoLocateDoneRef = useRef(false);
  const pendingUserRef = useRef<UserPos | null>(null);
  const userPosRef = useRef<UserPos | null>(null);
  const errorRef = useRef(onError);
  errorRef.current = onError;
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  const located = useMemo(() => places.filter((p) => p.lat != null && p.lng != null), [places]);
  const selected = selectedId ? (places.find((p) => p.id === selectedId) ?? null) : null;

  const syncUserSource = useCallback((pos: UserPos) => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    const source = map.getSource("user-location") as GeoJSONSource | undefined;
    if (!source) return;
    source.setData({
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "Point", coordinates: [pos.lng, pos.lat] }, properties: {} }],
    });
    if (map.getLayer("user-halo")) {
      map.setPaintProperty("user-halo", "circle-radius", accuracyToPixels(pos.accuracy, pos.lat, map.getZoom()));
    }
  }, []);

  const centerOnUser = useCallback((pos: UserPos) => {
    const map = mapRef.current;
    if (!map) return;
    const targetZoom = Math.max(map.getZoom(), USER_ZOOM);
    map.easeTo({ center: [pos.lng, pos.lat], zoom: targetZoom });
  }, []);

  const locate = useCallback(
    async (opts?: { auto?: boolean }) => {
      if (locatingRef.current) return;
      locatingRef.current = true;
      setLocating(true);
      try {
        const position = await getOneShotPosition();
        const next: UserPos = {
          lng: position.coords.longitude,
          lat: position.coords.latitude,
          accuracy: position.coords.accuracy ?? 0,
        };
        userPosRef.current = next;
        setUserPos(next);
        onGeoNote?.(null);
        const map = mapRef.current;
        if (map && mapReadyRef.current) {
          syncUserSource(next);
          centerOnUser(next);
        } else {
          pendingUserRef.current = next;
        }
      } catch {
        onGeoNote?.(opts?.auto ? GEO_FALLBACK_NOTE : GEO_STAY_NOTE);
      } finally {
        locatingRef.current = false;
        setLocating(false);
        if (opts?.auto) autoLocateDoneRef.current = true;
      }
    },
    [centerOnUser, syncUserSource, onGeoNote],
  );

  // Init map once. Sticky viewport lives here — only explicit locate/fit/cluster moves it.
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
      errorRef.current(`Map failed to start: ${err?.message ?? err} — this browser may lack WebGL2.`);
      return;
    }
    map.addControl(new NavigationControl(), "top-right");
    map.on("error", (e: any) => {
      const msg = e?.error?.message ?? "map error";
      errorRef.current(`Map error: ${msg} — check connection/tiles, then reload.`);
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
          map.addSource("user-location", { type: "geojson", data: emptyUserCollection() });
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
          // User dot + halo stay unthemed blue in all themes, beneath pins.
          map.addLayer({
            id: "user-halo",
            type: "circle",
            source: "user-location",
            paint: { "circle-color": USER_DOT, "circle-opacity": 0.15, "circle-radius": 20 },
          });
          map.addLayer({
            id: "user-dot",
            type: "circle",
            source: "user-location",
            paint: {
              "circle-color": USER_DOT,
              "circle-radius": 8,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2.5,
            },
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
          // Tip-anchored drops; fill + letter encode place type in all themes.
          // Unknown/custom types fall back to the generic grey pin.
          map.addLayer({
            id: "pins",
            type: "symbol",
            source: "places",
            filter: ["!", ["has", "point_count"]],
            layout: {
              "icon-image": ["match", ["get", "placeType"], "bar", "drop-bar", "café", "drop-café", "restaurant", "drop-restaurant", "drop-generic"],
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
              selectRef.current(id);
              setEditing(false);
            }
          });
          map.on("click", (e) => {
            const hits = map.queryRenderedFeatures(e.point, { layers: ["pins", "clusters"] });
            if (!hits.length) {
              selectRef.current(null);
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
          map.on("zoom", () => {
            const pos = userPosRef.current;
            if (!pos || !map.getLayer("user-halo")) return;
            map.setPaintProperty("user-halo", "circle-radius", accuracyToPixels(pos.accuracy, pos.lat, map.getZoom()));
          });

          mapReadyRef.current = true;
          setMapReady(true);
        } catch (err: any) {
          errorRef.current(`Map setup failed: ${err?.message ?? err} — reload to retry.`);
        }
      })();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      mapReadyRef.current = false;
      setMapReady(false);
    };
  }, []);

  // Keep the map sized to its pane (split view resizes the container).
  useEffect(() => {
    const el = containerRef.current;
    const map = mapRef.current;
    if (!el || !map) return;
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      try { map.resize(); } catch { /* ignore */ }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapReady]);

  // First-open auto-locate runs once in parallel with map init; never re-fires.
  useEffect(() => {
    if (autoLocateDoneRef.current) return;
    void locate({ auto: true });
  }, [locate]);

  // Drain a position that resolved before the map finished loading.
  useEffect(() => {
    if (!mapReady) return;
    const pending = pendingUserRef.current;
    if (!pending) return;
    pendingUserRef.current = null;
    syncUserSource(pending);
    centerOnUser(pending);
  }, [mapReady, syncUserSource, centerOnUser]);

  // Keep the dot source in sync (pin updates never move the viewport).
  useEffect(() => {
    if (!mapReady || !userPos) return;
    syncUserSource(userPos);
  }, [userPos, mapReady, syncUserSource]);

  // Push pin data without touching the viewport (also ensures custom-type images exist).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const source = map.getSource("places") as GeoJSONSource | undefined;
    if (!source) return;
    const fc = toGeoJSON(places);
    source.setData(fc);
    const distinct = [...new Set(places.map((p) => (p.placeType ?? "restaurant").toLowerCase()))];
    void ensurePinImages(map, mode, distinct);
    // eslint-disable-next-line no-console
    console.info(`[map] pushed ${fc.features.length} pins`);
  }, [places, mapReady, mode]);

  // Ensure drop images exist for current mode (fills encode type).
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
      padding: {
        top: 60,
        bottom: !isDesktop && selected ? 260 : 60,
        left: 40,
        right: isDesktop && selected ? 420 : 40,
      },
      maxZoom: 15,
    });
  }

  async function handleSave(p: Place, patch: { tags: string[]; rating: number | null; note: string | null; placeType: string }) {
    setEditing(false);
    try {
      await onSaveEdit(p, patch);
    } catch (err: any) {
      setEditing(true);
      onError(err?.message ?? "Update failed — rolled back.");
    }
  }

  return (
    <div className="edge radius-card relative overflow-hidden border-line">
      <div ref={containerRef} className={`maplibre-themed w-full ${mapHeightClass}`} aria-label="places map" />
      {/* Floating map actions top-left: NavigationControl lives top-right, so this avoids overlap */}
      <div className="absolute left-3 top-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void locate()}
          disabled={locating}
          aria-label="locate me"
          title="Locate me"
          className="edge radius-input inline-flex min-h-[48px] min-w-[48px] items-center justify-center border-line bg-surface/95 text-lg text-ink shadow-theme backdrop-blur disabled:opacity-40"
        >
          {locating ? "…" : "◎"}
        </button>
        <button
          type="button"
          onClick={fitToResults}
          disabled={!located.length}
          aria-label="fit map to results"
          title="Fit to results"
          className="edge radius-input inline-flex min-h-[48px] min-w-[48px] items-center justify-center border-line bg-surface/95 text-lg text-ink shadow-theme backdrop-blur disabled:opacity-40"
        >
          ⤢
        </button>
      </div>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/70 text-sm text-muted">Loading…</div>
      )}
      {selected && (
        <div className="radius-card absolute inset-x-0 bottom-0 max-h-[55%] overflow-y-auto border-t border-line bg-surface p-3 shadow-theme lg:inset-x-auto lg:bottom-3 lg:right-3 lg:top-3 lg:max-h-none lg:w-96 lg:border lg:pt-2">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              aria-label="close details"
              className="edge radius-input border-line bg-surface px-2 py-0.5 text-xs text-ink"
              onClick={() => {
                onSelect(null);
                setEditing(false);
              }}
            >
              Close
            </button>
          </div>
          <PlaceCard place={selected} onToggleStatus={onFlipStatus} onEdit={() => { if (!readOnly) setEditing(true); }} readOnly={readOnly} />
          {!readOnly && editing && <PlaceEditor place={selected} onSave={(patch) => handleSave(selected, patch)} onCancel={() => setEditing(false)} />}
        </div>
      )}
    </div>
  );
}
