# ── Build stage ────────────────────────────────────────────────────────────────
# better-sqlite3 needs a compiler on slim images.
FROM node:24-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM node:24-slim AS runtime
WORKDIR /app

# Production defaults mirroring .env.dev / .env.sample variable names.
# Override at runtime via compose `environment:` / env_file / -e.
# SESSION_SECRET has NO default here — it must be provided in production
# (config.ts refuses to boot without it).
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATABASE_PATH=/data/app.db \
    COOKIE_SECURE=true \
    DEV_LOGIN=false \
    TRUST_PROXY=true \
    GOOGLE_PLACES_KEY="" \
    APP_ORIGIN="" \
    OIDC_ISSUER="" \
    OIDC_CLIENT_ID="" \
    OIDC_CLIENT_SECRET="" \
    OIDC_REDIRECT_URI=""
# APP_ORIGIN empty = derived as http://localhost:${PORT} at runtime.
# Set APP_ORIGIN (e.g. https://app.example.com) per deployment;
# OIDC callback defaults to ${APP_ORIGIN}/api/auth/callback unless
# OIDC_REDIRECT_URI is set explicitly.

RUN groupadd -r app && useradd -r -g app app \
  && mkdir -p /data /app/data && chown -R app:app /data /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
# Migrations are embedded in dist (src/db/index.ts), no drizzle/ dir needed.
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
USER app
EXPOSE 3000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
