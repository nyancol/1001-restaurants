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
  statusParam: string;
  tagsParam: string;
  qParam: string;
  status: string;
  setStatus: (s: string) => void;
  tags: string[];
  setTags: (t: string[]) => void;
  q: string;
  setQ: (q: string) => void;
  debouncedQ: string;
}

/**
 * Shared filter state for the List and Map tabs. Both read/write the same
 * URL params so switching tabs preserves filters (single source of truth).
 */
export function usePlaceFilters(): PlaceFilters {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get("status") ?? "";
  const tagsParam = searchParams.get("tags") ?? "";
  const qParam = searchParams.get("q") ?? "";

  const [status, setStatus] = useState(statusParam);
  const [tags, setTags] = useState<string[]>(tagsParam ? tagsParam.split(",").filter(Boolean) : []);
  const [q, setQ] = useState(qParam);

  const debouncedQ = useDebouncedValue(q, 300);

  // Sync state → URL.
  useEffect(() => {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (tags.length) next.set("tags", tags.join(","));
    if (debouncedQ.trim()) next.set("q", debouncedQ.trim());
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, tags, debouncedQ]);

  return { statusParam, tagsParam, qParam, status, setStatus, tags, setTags, q, setQ, debouncedQ };
}
