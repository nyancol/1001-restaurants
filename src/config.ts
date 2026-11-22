import { parseOtelEnv } from "./observability/env.js";

export interface AppConfig {
  port: number;
  host: string;
  nodeEnv: string;
  databasePath: string;
  sessionSecret: string;
  cookieSecure: boolean;
  devLoginEnabled: boolean;
  appOrigin: string;
  oidcIssuer: string;
  oidcClientId: string;
  oidcClientSecret: string;
  oidcRedirectUri: string;
  oidcEnabled: boolean;
  googlePlacesKey: string;
  placesApiResource: string;
  trustProxy: boolean;
  otelEndpoint: string;
  otelServiceName: string;
  otelEnvironment: string;
  otelServiceVersion: string;
  otelEnabled: boolean;
}

function required(name: string, value: string | undefined): string {
  return (value ?? "").trim();
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? "development";
  const databasePath = env.DATABASE_PATH?.trim() || "/data/app.db";
  const sessionSecret =
    env.SESSION_SECRET?.trim() ||
    (nodeEnv === "production" ? "" : "dev-only-secret-change-me-32-chars!!");
  if (!sessionSecret) {
    throw new Error(
      "Invalid config: SESSION_SECRET must be set in production (32+ chars recommended).",
    );
  }
  const oidcIssuer = required("OIDC_ISSUER", env.OIDC_ISSUER);
  const oidcClientId = required("OIDC_CLIENT_ID", env.OIDC_CLIENT_ID);
  const oidcClientSecret = required("OIDC_CLIENT_SECRET", env.OIDC_CLIENT_SECRET);
  // Public origin of the app (scheme + host + optional port, no path).
  // Single host variable per deployment; the OIDC callback is derived from it
  // unless OIDC_REDIRECT_URI is set explicitly (explicit value always wins).
  const appOriginRaw = env.APP_ORIGIN?.trim() || `http://localhost:${env.PORT ?? "3000"}`;
  const appOrigin = appOriginRaw.replace(/\/+$/, "");
  const oidcRedirectUri = env.OIDC_REDIRECT_URI?.trim() || `${appOrigin}/api/auth/callback`;
  const oidcEnabled = Boolean(oidcIssuer && oidcClientId);
  const placesApiResource = (env.PLACES_API_RESOURCE ?? "").trim().replace(/\/+$/, "");

  // Fail fast on malformed public origin / OIDC values.
  if (env.OIDC_ISSUER !== undefined && env.OIDC_ISSUER.trim() !== "") {
    try {
      const u = new URL(oidcIssuer);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error("bad protocol");
    } catch {
      throw new Error(
        `Invalid OIDC config: OIDC_ISSUER is not a valid URL ("${oidcIssuer}"). Check issuer/client/redirect values.`,
      );
    }
  }
  if (oidcEnabled && !oidcClientSecret) {
    throw new Error(
      "Invalid OIDC config: OIDC_CLIENT_SECRET is required when OIDC_ISSUER and OIDC_CLIENT_ID are set.",
    );
  }
  try {
    const u = new URL(appOrigin);
    if (!["http:", "https:"].includes(u.protocol)) throw new Error("bad protocol");
  } catch {
    throw new Error(
      `Invalid config: APP_ORIGIN is not a valid URL ("${appOrigin}"). Expected e.g. "https://app.example.com".`,
    );
  }
  try {
    new URL(oidcRedirectUri);
  } catch {
    throw new Error(
      `Invalid OIDC config: OIDC_REDIRECT_URI is not a valid URL ("${oidcRedirectUri}").`,
    );
  }
  if (placesApiResource) {
    try {
      const u = new URL(placesApiResource);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error("bad protocol");
    } catch {
      throw new Error(
        `Invalid Places API config: PLACES_API_RESOURCE is not a valid URL ("${placesApiResource}").`,
      );
    }
    if (!oidcIssuer) {
      throw new Error(
        "Invalid Places API config: OIDC_ISSUER is required when PLACES_API_RESOURCE is set.",
      );
    }
  }

  // Dev-only stub login: double-gated — explicit opt-in AND non-production.
  // The route is not registered at all unless this is true.
  const devLoginEnabled = (env.DEV_LOGIN ?? "false") === "true" && nodeEnv !== "production";

  // OTEL telemetry: lenient by design — never throws. Presence of a valid
  // http(s) endpoint enables export; unset/empty/invalid disables silently
  // (preprod/dev stay dark). Both prod and preprod run NODE_ENV=production,
  // so endpoint presence (not NODE_ENV) is the switch.
  // Parsing lives in observability/env.ts (shared with register.ts).
  const otel = parseOtelEnv(env as NodeJS.ProcessEnv);

  return {
    port: Number(env.PORT ?? 3000),
    host: env.HOST ?? "0.0.0.0",
    nodeEnv,
    databasePath,
    sessionSecret,
    devLoginEnabled,
    cookieSecure:
      env.COOKIE_SECURE !== undefined ? env.COOKIE_SECURE === "true" : nodeEnv === "production",
    appOrigin,
    oidcIssuer,
    oidcClientId,
    oidcClientSecret,
    oidcRedirectUri,
    oidcEnabled,
    googlePlacesKey: env.GOOGLE_PLACES_KEY?.trim() ?? "",
    placesApiResource,
    trustProxy: (env.TRUST_PROXY ?? "true") === "true",
    otelEndpoint: otel.endpoint,
    otelServiceName: otel.serviceName,
    otelEnvironment: otel.environment,
    otelServiceVersion: otel.serviceVersion,
    otelEnabled: otel.enabled,
  };
}
