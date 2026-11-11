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
  ownerDisplayName?: string | null;
  googlePlaceId: string | null;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  status: "WANT_TO_GO" | "BEEN_TO";
  placeType: string;
  tags: string[];
  rating: number | null;
  note: string | null;
  hours?: { periods?: { open?: { day: number; hour: number; minute: number }; close?: { day: number; hour: number; minute: number } }[]; weekdayDescriptions?: string[] } | null;
  businessStatus?: string | null;
  priceLevel?: string | null;
  priceRange?: any | null;
  googleRating?: number | null;
  googleRatingCount?: number | null;
  websiteUri?: string | null;
  mapsLinks?: any | null;
  googleMapsUri?: string | null;
  utcOffsetMinutes?: number | null;
  createdAt: number;
  updatedAt: number;
}

export async function getMe(): Promise<{ id: string; displayName: string | null }> {
  return apiFetch("/api/auth/me");
}

export interface DirectoryUser {
  id: string;
  displayName: string | null;
  placeCount: number;
}

export async function listUsers(): Promise<DirectoryUser[]> {
  const body = await apiFetch("/api/users");
  return body.users ?? [];
}

export async function listPlaces(params: {
  owner?: string;
  status?: string;
  placeType?: string;
  tags?: string;
  q?: string;
  openAt?: string;
  openNow?: boolean;
}): Promise<Place[]> {
  const sp = new URLSearchParams();
  sp.set("owner", params.owner ?? "me");
  if (params.status) sp.set("status", params.status);
  if (params.placeType) sp.set("placeType", params.placeType);
  if (params.tags) sp.set("tags", params.tags);
  if (params.q) sp.set("q", params.q);
  if (params.openAt) sp.set("openAt", params.openAt);
  else if (params.openNow) sp.set("openNow", "1");
  const body = await apiFetch(`/api/places?${sp.toString()}`);
  const places: Place[] = body.places ?? [];
  // Newest first by creation.
  return [...places].sort((a, b) => b.createdAt - a.createdAt);
}

export async function createPlace(input: {
  name: string;
  placeType: string;
  status?: string;
  tags?: string[];
  rating?: number | null;
  note?: string | null;
  googlePlaceId?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  hours?: any;
  businessStatus?: string | null;
  priceLevel?: string | null;
  priceRange?: any;
  googleRating?: number | null;
  googleRatingCount?: number | null;
  websiteUri?: string | null;
  mapsLinks?: any;
  utcOffsetMinutes?: number | null;
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

export interface PlaceTypeCount {
  type: string;
  count: number;
}

export async function getPlaceTypes(q = ""): Promise<PlaceTypeCount[]> {
  const body = await apiFetch(`/api/place-types${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  return body.placeTypes ?? [];
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
  placeType?: string | null;
  hours?: any;
  businessStatus?: string | null;
  priceLevel?: string | null;
  priceRange?: any;
  googleRating?: number | null;
  googleRatingCount?: number | null;
  websiteUri?: string | null;
  mapsLinks?: any;
  googleMapsUri?: string | null;
  utcOffsetMinutes?: number | null;
}

function mapGoogleType(t: unknown): string | null {
  if (typeof t !== "string" || !t) return null;
  const v = t.toLowerCase();
  if (v.includes("coffee") || v === "cafe" || v.includes("café")) return "café";
  if (v.includes("bar") || v.includes("pub") || v.includes("cocktail") || v.includes("wine")) return "bar";
  if (v.includes("restaurant") || v.includes("food") || v.includes("brunch") || v.includes("bistro") || v.includes("izakaya")) return "restaurant";
  return null;
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
  const rawType = body?.primaryType ?? body?.primaryTypeDisplayName?.text ?? (Array.isArray(body?.types) ? body.types[0] : null);
  const hours = body?.regularOpeningHours ?? body?.currentOpeningHours ?? body?.result?.opening_hours ?? null;
  const mapsLinks = body?.googleMapsLinks ?? null;
  const googleMapsUri = body?.googleMapsUri ?? mapsLinks?.placeUri ?? null;
  return {
    googlePlaceId,
    name: typeof name === "string" ? name : fallbackText,
    address: typeof address === "string" ? address : null,
    lat: typeof lat === "number" ? lat : null,
    lng: typeof lng === "number" ? lng : null,
    placeType: mapGoogleType(rawType),
    hours: hours ? { periods: hours.periods ?? [], weekdayDescriptions: hours.weekdayDescriptions ?? [] } : null,
    businessStatus: body?.businessStatus ?? null,
    priceLevel: body?.priceLevel ?? null,
    priceRange: body?.priceRange ?? null,
    googleRating: typeof body?.rating === "number" ? body.rating : null,
    googleRatingCount: typeof body?.userRatingCount === "number" ? body.userRatingCount : null,
    websiteUri: body?.websiteUri ?? null,
    mapsLinks,
    googleMapsUri,
    utcOffsetMinutes: typeof body?.utcOffsetMinutes === "number" ? body.utcOffsetMinutes : null,
  };
}

export function mapsUrlFor(p: Place): string | null {
  if (p.googleMapsUri) return p.googleMapsUri;
  const m: any = p.mapsLinks;
  if (m?.placeUri) return m.placeUri;
  if (typeof m === "string") return m;
  if (p.googlePlaceId) return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(p.googlePlaceId)}`;
  if (p.lat != null && p.lng != null) return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  return null;
}
