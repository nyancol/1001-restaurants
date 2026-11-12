import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTHeaderParameters } from "jose";

export interface PlacesPrincipal {
  clientId: string;
  scopes: string[];
  subject: string;
}

export type KeyResolver = (header: JWTHeaderParameters) => Promise<any>;

const remoteSets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function remoteResolver(jwksUrl: string): KeyResolver {
  let set = remoteSets.get(jwksUrl);
  if (!set) {
    set = createRemoteJWKSet(new URL(jwksUrl));
    remoteSets.set(jwksUrl, set);
  }
  const jwks = set;
  return async (header) => jwks(header as any, {} as any);
}

export function getBearerToken(header: unknown): string | null {
  if (typeof header !== "string") return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1].trim() : null;
}

export function isPlacesPath(urlPath: string): boolean {
  return urlPath === "/api/places" || urlPath.startsWith("/api/places/");
}

function isRefreshPath(urlPath: string): boolean {
  return /^\/api\/places\/[^/]+\/refresh$/.test(urlPath);
}

/**
 * Scope required for an M2M call, or null when M2M is not allowed there at all
 * (user-only writes: POST create, PATCH, DELETE on /api/places*).
 */
export function requiredScopeForPlaces(method: string, urlPath: string): string | null {
  if (!isPlacesPath(urlPath)) return "__not_places__";
  if (method === "GET") return "read:places";
  if (method === "POST" && isRefreshPath(urlPath)) return "refresh:places";
  return null;
}

export function hasScope(scopes: string[], required: string): boolean {
  return scopes.includes(required);
}

function parseScopes(payload: JWTPayload): string[] {
  const raw = (payload as any).scope;
  if (typeof raw !== "string") return [];
  return raw.split(/\s+/).map((s) => s.trim()).filter(Boolean);
}

function principalFromPayload(payload: JWTPayload): PlacesPrincipal {
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const claimed = (payload as any).client_id ?? (payload as any).azp;
  const clientId = typeof claimed === "string" && claimed
    ? claimed
    : sub.startsWith("client-") ? sub.slice("client-".length) : sub;
  return { clientId, scopes: parseScopes(payload), subject: sub };
}

function audContains(payload: JWTPayload, resource: string): boolean {
  const aud = payload.aud;
  if (typeof aud === "string") return aud === resource;
  if (Array.isArray(aud)) return aud.includes(resource);
  return false;
}

export async function verifyPlacesBearer(
  token: string,
  opts: { resource: string; issuer: string; resolveKey?: KeyResolver; jwksUrl?: string },
): Promise<PlacesPrincipal> {
  const { resource, issuer } = opts;
  if (!resource || !issuer) {
    const err: any = new Error("places_api_not_configured");
    err.code = 401;
    throw err;
  }
  const resolveKey = opts.resolveKey ?? (opts.jwksUrl ? remoteResolver(opts.jwksUrl) : null);
  if (!resolveKey) {
    const err: any = new Error("places_api_not_configured");
    err.code = 401;
    throw err;
  }
  let payload: JWTPayload;
  try {
    const verified = await jwtVerify(token, resolveKey as any, { issuer });
    payload = verified.payload;
  } catch {
    const err: any = new Error("invalid_token");
    err.code = 401;
    throw err;
  }
  if (!audContains(payload, resource)) {
    const err: any = new Error("invalid_audience");
    err.code = 401;
    throw err;
  }
  return principalFromPayload(payload);
}
