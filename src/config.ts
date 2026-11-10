export interface AppConfig {
  port: number;
  host: string;
  nodeEnv: string;
  databasePath: string;
  sessionSecret: string;
  cookieSecure: boolean;
  devLoginEnabled: boolean;
  oidcIssuer: string;
  oidcClientId: string;
  oidcClientSecret: string;
  oidcRedirectUri: string;
  oidcEnabled: boolean;
  googlePlacesKey: string;
  trustProxy: boolean;
}

function required(name: string, value: string | undefined): string {
  return (value ?? "").trim();
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? "development";
  const databasePath = env.DATABASE_PATH?.trim() || "/data/app.db";
  const sessionSecret = env.SESSION_SECRET?.trim() || (nodeEnv === "production" ? "" : "dev-only-secret-change-me-32-chars!!");
  if (!sessionSecret) {
    throw new Error(
      "Invalid config: SESSION_SECRET must be set in production (32+ chars recommended)."
    );
  }
  const oidcIssuer = required("OIDC_ISSUER", env.OIDC_ISSUER);
  const oidcClientId = required("OIDC_CLIENT_ID", env.OIDC_CLIENT_ID);
  const oidcClientSecret = required("OIDC_CLIENT_SECRET", env.OIDC_CLIENT_SECRET);
  const redirectDefault = `http://localhost:${env.PORT ?? "3000"}/api/auth/callback`;
  const oidcRedirectUri = env.OIDC_REDIRECT_URI?.trim() || redirectDefault;
  const oidcEnabled = Boolean(oidcIssuer && oidcClientId);

  // Fail fast on malformed OIDC values when OIDC is expected.
  if (env.OIDC_ISSUER !== undefined && env.OIDC_ISSUER.trim() !== "") {
    try {
      const u = new URL(oidcIssuer);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error("bad protocol");
    } catch {
      throw new Error(
        `Invalid OIDC config: OIDC_ISSUER is not a valid URL ("${oidcIssuer}"). Check issuer/client/redirect values.`
      );
    }
  }
  if (oidcEnabled && !oidcClientSecret) {
    throw new Error(
      "Invalid OIDC config: OIDC_CLIENT_SECRET is required when OIDC_ISSUER and OIDC_CLIENT_ID are set."
    );
  }
  try {
    new URL(oidcRedirectUri);
  } catch {
    throw new Error(
      `Invalid OIDC config: OIDC_REDIRECT_URI is not a valid URL ("${oidcRedirectUri}").`
    );
  }

  // Dev-only stub login: double-gated — explicit opt-in AND non-production.
  // The route is not registered at all unless this is true.
  const devLoginEnabled = (env.DEV_LOGIN ?? "false") === "true" && nodeEnv !== "production";

  return {
    port: Number(env.PORT ?? 3000),
    host: env.HOST ?? "0.0.0.0",
    nodeEnv,
    databasePath,
    sessionSecret,
    devLoginEnabled,
    cookieSecure: env.COOKIE_SECURE !== undefined
      ? env.COOKIE_SECURE === "true"
      : nodeEnv === "production",
    oidcIssuer,
    oidcClientId,
    oidcClientSecret,
    oidcRedirectUri,
    oidcEnabled,
    googlePlacesKey: env.GOOGLE_PLACES_KEY?.trim() ?? "",
    trustProxy: (env.TRUST_PROXY ?? "true") === "true",
  };
}
