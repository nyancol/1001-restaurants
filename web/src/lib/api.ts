export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
  if (res.status === 401) throw new UnauthorizedError();
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const err: any = new Error(body?.error ?? `request failed: ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export interface Place {
  id: string;
  ownerId: string;
  googlePlaceId: string | null;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  status: "WANT_TO_GO" | "BEEN_TO";
  tags: string[];
  rating: number | null;
  note: string | null;
  createdAt: number;
  updatedAt: number;
}

export async function getMe(): Promise<{ id: string; displayName: string | null }> {
  return apiFetch("/api/auth/me");
}

export async function listPlaces(params: {
  owner?: string;
  status?: string;
  tags?: string;
  q?: string;
}): Promise<Place[]> {
  const sp = new URLSearchParams();
  sp.set("owner", params.owner ?? "me");
  if (params.status) sp.set("status", params.status);
  if (params.tags) sp.set("tags", params.tags);
  if (params.q) sp.set("q", params.q);
  const body = await apiFetch(`/api/places?${sp.toString()}`);
  const places: Place[] = body.places ?? [];
  // Newest first by creation.
  return [...places].sort((a, b) => b.createdAt - a.createdAt);
}

export async function createPlace(input: {
  name: string;
  status?: string;
  tags?: string[];
  rating?: number | null;
  note?: string | null;
  googlePlaceId?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
}): Promise<Place> {
  return apiFetch("/api/places", { method: "POST", body: JSON.stringify(input) });
}

export async function patchPlace(id: string, patch: Partial<Place> & Record<string, unknown>): Promise<Place> {
  return apiFetch(`/api/places/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export interface TagCount {
  tag: string;
  count: number;
}

export async function getTags(q = ""): Promise<TagCount[]> {
  const body = await apiFetch(`/api/tags${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  return body.tags ?? [];
}

export interface AutocompleteSuggestion {
  placeId: string;
  text: string;
  secondary?: string;
}

export function parseAutocomplete(body: any): AutocompleteSuggestion[] {
  const suggestions = body?.suggestions ?? body?.predictions ?? [];
  return suggestions
    .map((s: any) => {
      const pp = s.placePrediction ?? s;
      const placeId = pp.placeId ?? pp.place_id ?? pp.id ?? "";
      const text =
        pp.text?.text ?? pp.description ?? pp.structuredFormat?.mainText?.text ?? pp.mainText ?? "";
      const secondary =
        pp.structuredFormat?.secondaryText?.text ?? pp.secondary_text ?? undefined;
      return placeId && text ? { placeId, text, secondary } : null;
    })
    .filter(Boolean) as AutocompleteSuggestion[];
}

export interface PlaceDetails {
  googlePlaceId: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

export function parseDetails(body: any, fallbackPlaceId: string, fallbackText: string): PlaceDetails {
  const name =
    body?.displayName?.text ?? body?.name ?? body?.result?.name ?? fallbackText;
  const address =
    body?.formattedAddress ?? body?.formatted_address ?? body?.result?.formatted_address ?? null;
  const lat =
    body?.location?.latitude ??
    body?.geometry?.location?.lat ??
    body?.result?.geometry?.location?.lat ??
    null;
  const lng =
    body?.location?.longitude ??
    body?.geometry?.location?.lng ??
    body?.result?.geometry?.location?.lng ??
    null;
  const googlePlaceId = body?.id ?? body?.place_id ?? body?.result?.place_id ?? fallbackPlaceId;
  return {
    googlePlaceId,
    name: typeof name === "string" ? name : fallbackText,
    address: typeof address === "string" ? address : null,
    lat: typeof lat === "number" ? lat : null,
    lng: typeof lng === "number" ? lng : null,
  };
}
