export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<any> {
  const hasBody = init.body !== undefined && init.body !== null;
  const headers = new Headers(init.headers);
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers,
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
    let message = `request failed: ${res.status}`;
    if (typeof body === "string" && body.trim()) message = body;
    else if (typeof body?.error === "string" && body.error) message = body.error;
    throw new ApiError(message, res.status, body);
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
  icon: string;
  tags: string[];
  rating: number | null;
  note: string | null;
  hours?: {
    periods?: {
      open?: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }[];
    weekdayDescriptions?: string[];
  } | null;
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
  const body = await apiFetch("/api/v1/users");
  return (body.data ?? body.users ?? []) as DirectoryUser[];
}

export async function listPlaces(params: {
  owner?: string;
  status?: string;
  tags?: string;
  q?: string;
  openAt?: string;
  openNow?: boolean;
  price?: string;
}): Promise<Place[]> {
  const sp = new URLSearchParams();
  sp.set("owner", params.owner ?? "me");
  if (params.status) sp.set("status", params.status);
  if (params.tags) sp.set("tags", params.tags);
  if (params.q) sp.set("q", params.q);
  if (params.openAt) sp.set("openAt", params.openAt);
  else if (params.openNow) sp.set("openNow", "1");
  if (params.price) sp.set("price", params.price);
  const body = await apiFetch(`/api/v1/places?${sp.toString()}`);
  const places: Place[] = (body.data ?? body.places ?? []) as Place[];
  // Newest first by creation (server already orders by updatedAt DESC).
  return [...places].sort((a, b) => b.createdAt - a.createdAt);
}

export async function createPlace(input: {
  name: string;
  icon?: string;
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
  return apiFetch("/api/v1/places", { method: "POST", body: JSON.stringify(input) });
}

export async function patchPlace(
  id: string,
  patch: Partial<Place> & Record<string, unknown>,
): Promise<Place> {
  return apiFetch(`/api/v1/places/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function refreshPlace(id: string): Promise<Place> {
  return apiFetch(`/api/v1/places/${encodeURIComponent(id)}/refresh`, {
    method: "POST",
  });
}

export async function deletePlace(id: string): Promise<{ ok: true }> {
  return apiFetch(`/api/v1/places/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export interface TagCount {
  tag: string;
  color: string;
  count: number;
}

export async function getTags(q = ""): Promise<TagCount[]> {
  const body = await apiFetch(`/api/v1/tags${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  const raw: any[] = (body.data ?? body.tags ?? []) as any[];
  // Backward-compatible fallback: legacy {tag,count} without color.
  const { colorForTag } = await import("./tagPalette");
  return raw.map((t) => ({
    tag: t.tag,
    color: typeof t.color === "string" ? t.color : colorForTag(t.tag),
    count: typeof t.count === "number" ? t.count : 0,
  }));
}

export async function createTag(name: string, color?: string): Promise<TagCount & { tag: string }> {
  const body = await apiFetch("/api/v1/tags", {
    method: "POST",
    body: JSON.stringify(color ? { name, color } : { name }),
  });
  return { tag: body.tag, color: body.color, count: 0 };
}

export async function patchTag(
  name: string,
  patch: { newName?: string; color?: string },
): Promise<{ tag: string; color: string; merged?: boolean }> {
  return apiFetch(`/api/v1/tags/${encodeURIComponent(name)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteTag(name: string): Promise<{ ok: true }> {
  return apiFetch(`/api/v1/tags/${encodeURIComponent(name)}`, { method: "DELETE" });
}

export interface PlaceTypeCount {
  type: string;
  count: number;
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
      const secondary = pp.structuredFormat?.secondaryText?.text ?? pp.secondary_text ?? undefined;
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
  icon?: string | null;
  venueTypeLabel?: string | null;
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

const PRIMARY_TYPE_TO_ICON: Record<string, string> = {
  hamburger_restaurant: "burger",
  pizza_restaurant: "pizza",
  ramen_restaurant: "soup",
  noodle_shop: "soup",
  pho_restaurant: "soup",
  soup_restaurant: "soup",
  hot_dog_restaurant: "hotdog",
  hotdog_restaurant: "hotdog",
  bagel_shop: "bagel",
  bakery: "croissant",
  patisserie: "croissant",
  croissant_shop: "croissant",
  boulangerie: "croissant",
  ice_cream_shop: "ice-cream",
  gelateria: "ice-cream",
  dessert_shop: "ice-cream",
  yogurt_shop: "ice-cream",
  cocktail_bar: "cocktail",
  pub: "cocktail",
  speakeasy: "cocktail",
  wine_bar: "wine",
  brewery: "beer",
  beer_garden: "beer",
  irish_pub: "beer",
  sports_bar: "beer",
  cafe: "coffee",
  coffee_shop: "coffee",
  tea_house: "coffee",
  brunch_restaurant: "coffee",
};

export function inferIcon(primaryType: unknown, types: unknown): string {
  const pick = (v: unknown): string | null => {
    if (typeof v !== "string" || !v) return null;
    return PRIMARY_TYPE_TO_ICON[v.trim().toLowerCase()] ?? null;
  };
  return (
    pick(primaryType) ??
    (Array.isArray(types) ? (types.map(pick).find(Boolean) as string | undefined) : undefined) ??
    "fork"
  );
}

const GENERIC_VENUE_TYPES = new Set(["point_of_interest", "establishment"]);

export function prettifyVenueType(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const clean = code.trim().toLowerCase();
  if (!clean || GENERIC_VENUE_TYPES.has(clean)) return null;
  return clean
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function venueTypeLabelFromDetails(body: any): string | null {
  const display = body?.primaryTypeDisplayName;
  const displayText =
    typeof display === "string" ? display : typeof display?.text === "string" ? display.text : null;
  if (typeof displayText === "string" && displayText.trim()) return displayText.trim();
  const primary = prettifyVenueType(body?.primaryType);
  if (primary) return primary;
  const types = Array.isArray(body?.types)
    ? body.types
    : Array.isArray(body?.result?.types)
      ? body.result.types
      : [];
  for (const t of types) {
    const label = prettifyVenueType(t);
    if (label) return label;
  }
  return null;
}

/**
 * Duplicate-merge rule for the nullable star rating on add surfaces.
 * A null/undefined draft means "untouched" and must preserve the stored
 * rating; an explicit 1-5 wins. Used by the mobile add sheet (and mirrors
 * desktop intent) on both pre-check and 409 duplicate paths.
 */
export function mergeDuplicateRating(
  draft: number | null | undefined,
  existing: number | null | undefined,
): number | null {
  return draft ?? existing ?? null;
}

export function parseDetails(
  body: any,
  fallbackPlaceId: string,
  fallbackText: string,
): PlaceDetails {
  const name = body?.displayName?.text ?? body?.name ?? body?.result?.name ?? fallbackText;
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
  const rawType = body?.primaryType ?? null;
  const rawTypes = Array.isArray(body?.types) ? body.types : null;
  const hours =
    body?.regularOpeningHours ?? body?.currentOpeningHours ?? body?.result?.opening_hours ?? null;
  const mapsLinks = body?.googleMapsLinks ?? null;
  const googleMapsUri = body?.googleMapsUri ?? mapsLinks?.placeUri ?? null;
  return {
    googlePlaceId,
    name: typeof name === "string" ? name : fallbackText,
    address: typeof address === "string" ? address : null,
    lat: typeof lat === "number" ? lat : null,
    lng: typeof lng === "number" ? lng : null,
    icon: inferIcon(rawType, rawTypes),
    venueTypeLabel: venueTypeLabelFromDetails(body),
    hours: hours
      ? { periods: hours.periods ?? [], weekdayDescriptions: hours.weekdayDescriptions ?? [] }
      : null,
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

function safeExternalUrl(u: unknown): string | null {
  if (typeof u !== "string" || !u) return null;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

export function mapsUrlFor(p: Place): string | null {
  const stored =
    safeExternalUrl(p.googleMapsUri) ??
    safeExternalUrl((p.mapsLinks as any)?.placeUri) ??
    safeExternalUrl(p.mapsLinks);
  if (stored) return stored;
  if (p.googlePlaceId)
    return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(p.googlePlaceId)}`;
  if (p.lat != null && p.lng != null)
    return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  return null;
}
