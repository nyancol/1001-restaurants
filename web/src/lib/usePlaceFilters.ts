import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export interface PlaceFilters {
  ownerParam: string;
  statusParam: string;
  tagsParam: string;
  qParam: string;
  openAtParam: string;
  openNowParam: boolean;
  priceParam: string;
  owner: string;
  setOwner: (s: string) => void;
  status: string;
  setStatus: (s: string) => void;
  tags: string[];
  setTags: (t: string[]) => void;
  q: string;
  setQ: (q: string) => void;
  openEnabled: boolean;
  setOpenEnabled: (b: boolean) => void;
  openAt: string;
  setOpenAt: (s: string) => void;
  price: string;
  setPrice: (s: string) => void;
  debouncedQ: string;
}

/**
 * Shared filter state for the List and Map tabs. Both read/write the same
 * URL params so switching tabs preserves filters (single source of truth).
 */
export function usePlaceFilters(): PlaceFilters {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawOwner = searchParams.get("owner") ?? "me";
  const ownerParam = rawOwner === "" ? "me" : rawOwner;
  const statusParam = searchParams.get("status") ?? "";
  const tagsParam = searchParams.get("tags") ?? "";
  const qParam = searchParams.get("q") ?? "";
  const openAtParam = searchParams.get("openAt") ?? "";
  const openNowParam = searchParams.get("openNow") === "1";
  const priceParam = searchParams.get("price") ?? "";

  const [owner, setOwner] = useState(ownerParam);
  const [status, setStatus] = useState(statusParam);
  const [tags, setTags] = useState<string[]>(tagsParam ? tagsParam.split(",").filter(Boolean) : []);
  const [q, setQ] = useState(qParam);
  const [openEnabled, setOpenEnabled] = useState(Boolean(openAtParam || openNowParam));
  const [openAt, setOpenAt] = useState(openAtParam);
  const [price, setPrice] = useState(priceParam);

  // Adopt external `?owner=` changes (e.g. header user menu) so list + map
  // follow without a reload. Local picks flow through the same URL sync below.
  const prevOwnerParam = useRef<string | null>(null);
  useEffect(() => {
    // Adopt only genuine external owner changes (skip mount; mount state is
    // already initialized from the URL).
    if (prevOwnerParam.current !== null && ownerParam !== prevOwnerParam.current) {
      setOwner(ownerParam);
    }
    prevOwnerParam.current = ownerParam;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerParam]);

  const debouncedQ = useDebouncedValue(q, 300);

  // Sync state → URL. `me` is omitted to keep existing URLs clean.
  useEffect(() => {
    setSearchParams(
      (prev) => {
        // Keep params owned by other writers (e.g. UserMenu), overwrite only ours.
        const next = new URLSearchParams(prev);
        const put = (k: string, v: string | null) => (v ? next.set(k, v) : next.delete(k));
        put("owner", owner && owner !== "me" ? owner : null);
        put("status", status || null);
        put("tags", tags.length ? tags.join(",") : null);
        put("q", debouncedQ.trim() || null);
        if (openEnabled) {
          if (openAt) {
            next.set("openAt", openAt);
            next.delete("openNow");
          } else {
            next.set("openNow", "1");
            next.delete("openAt");
          }
        } else {
          next.delete("openAt");
          next.delete("openNow");
        }
        put("price", price || null);
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, status, tags, debouncedQ, openEnabled, openAt, price]);

  return {
    ownerParam,
    statusParam,
    tagsParam,
    qParam,
    openAtParam,
    openNowParam,
    priceParam,
    owner,
    setOwner,
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
    debouncedQ,
  };
}
