import { useCallback, useEffect, useRef, useState } from "react";
import { listPlaces, patchPlace, refreshPlace, deletePlace, UnauthorizedError, type Place } from "./api";
import { useLanguage } from "../i18n/LanguageContext";

export interface PlaceFilterParams {
  owner?: string;
  status?: string;
  placeType?: string;
  tags?: string;
  q?: string;
  openAt?: string;
  openNow?: boolean;
}

export type PlacePatch = Partial<Pick<Place, "status" | "tags" | "rating" | "note" | "placeType">> &
  Record<string, unknown>;

/**
 * Shared places data for the list and map panes (and the desktop split
 * parent). Single fetch per filter set with optimistic status/edit updates
 * and rollback on failure.
 */
export function usePlaces(params: PlaceFilterParams, onUnauthorized: () => void) {
  const { t } = useLanguage();
  const { owner, status, placeType, tags, q, openAt, openNow } = params;
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingIds, setRefreshingIds] = useState<string[]>([]);
  // Stable ref: inline `onUnauthorized` arrows in routes must not retrigger fetches.
  const unauthRef = useRef(onUnauthorized);
  unauthRef.current = onUnauthorized;

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPlaces({
        owner: owner || "me",
        status: status || undefined,
        placeType: placeType || undefined,
        tags: tags || undefined,
        q: q || undefined,
        openAt: openAt || undefined,
        openNow: !openAt && openNow ? true : undefined,
      });
      setPlaces(data);
    } catch (err: any) {
      if (err instanceof UnauthorizedError) {
        unauthRef.current();
        return;
      }
      setError(err?.message ?? t["error.loadPlaces"]);
    } finally {
      setLoading(false);
    }
  }, [owner, status, placeType, tags, q, openAt, openNow]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const flipStatus = useCallback(
    async (p: Place) => {
      const next = p.status === "WANT_TO_GO" ? "BEEN_TO" : "WANT_TO_GO";
      setPlaces((cur) => cur.map((x) => (x.id === p.id ? { ...x, status: next } : x)));
      try {
        const updated = await patchPlace(p.id, { status: next });
        setPlaces((cur) => cur.map((x) => (x.id === p.id ? updated : x)));
      } catch (err: any) {
        if (err instanceof UnauthorizedError) {
          unauthRef.current();
          return;
        }
        const msg = err?.message ?? t["editor.updateFailed"];
        await fetchList();
        setError(msg);
      }
    },
    [fetchList],
  );

  const saveEdit = useCallback(
    async (
      p: Place,
      patch: { tags: string[]; rating: number | null; note: string | null; placeType: string },
    ) => {
      const prev: Place = { ...p };
      setPlaces((cur) => cur.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
      try {
        const updated = await patchPlace(p.id, patch);
        setPlaces((cur) => cur.map((x) => (x.id === p.id ? updated : x)));
      } catch (err: any) {
        if (err instanceof UnauthorizedError) {
          unauthRef.current();
          return;
        }
        setPlaces((cur) => cur.map((x) => (x.id === p.id ? { ...x, ...prev, id: x.id } : x)));
        setError(err?.message ?? t["editor.updateFailed"]);
        throw err;
      }
    },
    [],
  );

  const refreshOne = useCallback(async (p: Place): Promise<Place> => {
    setRefreshingIds((cur) => (cur.includes(p.id) ? cur : [...cur, p.id]));
    try {
      const updated = await refreshPlace(p.id);
      setPlaces((cur) => cur.map((x) => (x.id === p.id ? updated : x)));
      return updated;
    } catch (err: any) {
      if (err instanceof UnauthorizedError) {
        unauthRef.current();
      }
      throw err;
    } finally {
      setRefreshingIds((cur) => cur.filter((id) => id !== p.id));
    }
  }, []);

  const deleteOne = useCallback(
    async (p: Place): Promise<void> => {
      setPlaces((cur) => cur.filter((x) => x.id !== p.id));
      try {
        await deletePlace(p.id);
      } catch (err: any) {
        if (err instanceof UnauthorizedError) {
          unauthRef.current();
          await fetchList();
          return;
        }
        // Already gone server-side: keep it removed locally.
        if (err?.status === 404) {
          return;
        }
        await fetchList();
        setError(err?.message ?? t["editor.deleteFailed"]);
        throw err;
      }
    },
    [fetchList, t],
  );

  return { places, setPlaces, loading, error, setError, fetchList, flipStatus, saveEdit, deleteOne, refreshOne, refreshingIds };
}
