import { useEffect, useState } from "react";
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
  placeTypeParam: string;
  openAtParam: string;
  openNowParam: boolean;
  owner: string;
  setOwner: (s: string) => void;
  status: string;
  setStatus: (s: string) => void;
  tags: string[];
  setTags: (t: string[]) => void;
  q: string;
  setQ: (q: string) => void;
  placeType: string;
  setPlaceType: (s: string) => void;
  openEnabled: boolean;
  setOpenEnabled: (b: boolean) => void;
  openAt: string;
  setOpenAt: (s: string) => void;
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
  const placeTypeParam = searchParams.get("placeType") ?? "";
  const openAtParam = searchParams.get("openAt") ?? "";
  const openNowParam = searchParams.get("openNow") === "1";

  const [owner, setOwner] = useState(ownerParam);
  const [status, setStatus] = useState(statusParam);
  const [tags, setTags] = useState<string[]>(tagsParam ? tagsParam.split(",").filter(Boolean) : []);
  const [q, setQ] = useState(qParam);
  const [placeType, setPlaceType] = useState(placeTypeParam);
  const [openEnabled, setOpenEnabled] = useState(Boolean(openAtParam || openNowParam));
  const [openAt, setOpenAt] = useState(openAtParam);

  const debouncedQ = useDebouncedValue(q, 300);

  // Sync state → URL. `me` is omitted to keep existing URLs clean.
  useEffect(() => {
    const next = new URLSearchParams();
    if (owner && owner !== "me") next.set("owner", owner);
    if (status) next.set("status", status);
    if (placeType) next.set("placeType", placeType);
    if (tags.length) next.set("tags", tags.join(","));
    if (debouncedQ.trim()) next.set("q", debouncedQ.trim());
    if (openEnabled) {
      if (openAt) next.set("openAt", openAt);
      else next.set("openNow", "1");
    }
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, status, placeType, tags, debouncedQ, openEnabled, openAt]);

  return { ownerParam, statusParam, tagsParam, qParam, placeTypeParam, openAtParam, openNowParam, owner, setOwner, status, setStatus, tags, setTags, q, setQ, placeType, setPlaceType, openEnabled, setOpenEnabled, openAt, setOpenAt, debouncedQ };
}
