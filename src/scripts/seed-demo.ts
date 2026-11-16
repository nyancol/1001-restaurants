// Deterministic demo seed for preprod previews ("fresh DB means demoable").
// Resets the target SQLite DB to migrated-empty plus a fixed fixture:
// 2 demo users, 6 places, tag definitions derived from place tags.
// Never touches prod: refuses to run against /data/app.db unless the
// PREPROD_RESEED=1 (set by the preprod-deploy wrapper for the staging
// volume) or ALLOW_PROD_SEED=1 marker is present, and never copies rows
// between databases.
//
// Usage (host):
//   DATABASE_PATH=./data/demo.db npx tsx src/scripts/seed-demo.ts
//   npm run db:seed-demo            # seeds $DATABASE_PATH (defaults ./data/demo.db)
// Usage (inside the preprod container, via the deploy wrapper):
//   PREPROD_RESEED=1 node dist/scripts/seed-demo.js   # DATABASE_PATH=/data/app.db there
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { openDb, runMigrations } from "../db/index.js";

export const FIXTURE_USERS = [
  { id: "demo-alice", sub: "demo:alice", displayName: "Demo Alice" },
  { id: "demo-bob", sub: "demo:bob", displayName: "Demo Bob" },
] as const;

export const FIXTURE_PLACES = [
  { owner: "demo-alice", name: "Chez Janou", address: "2 Rue Roger Verlomme, Paris", lat: 48.8546, lng: 2.3665, status: "WANT_TO_GO", icon: "fork", tags: ["francais", "bistrot"], rating: 4.5 },
  { owner: "demo-alice", name: "Breizh Cafe", address: "109 Rue Vieille du Temple, Paris", lat: 48.863, lng: 2.3632, status: "DONE", icon: "coffee", tags: ["cafe", "brunch"], rating: 4 },
  { owner: "demo-alice", name: "Le Baratin", address: "3 Rue Jouye-Rouve, Paris", lat: 48.8645, lng: 2.3798, status: "WANT_TO_GO", icon: "cocktail", tags: ["bar", "nature"], rating: null },
  { owner: "demo-bob", name: "Du Pain et des Idees", address: "34 Rue Yves Toudic, Paris", lat: 48.8707, lng: 2.3625, status: "DONE", icon: "croissant", tags: ["bakery"], rating: 5 },
  { owner: "demo-bob", name: "Septime", address: "80 Rue de Charonne, Paris", lat: 48.8533, lng: 2.3839, status: "WANT_TO_GO", icon: "fork", tags: ["gastronomique"], rating: null },
  { owner: "demo-bob", name: "Candelaria", address: "52 Rue de Saintonge, Paris", lat: 48.8628, lng: 2.3642, status: "DONE", icon: "cocktail", tags: ["bar", "mexicain"], rating: 4 },
] as const;

const PROD_DB_PATH = path.resolve("/data/app.db");

export function targetPath(env: NodeJS.ProcessEnv = process.env): string {
  if (env.DATABASE_PATH?.trim()) return path.resolve(env.DATABASE_PATH.trim());
  return env.NODE_ENV === "production" ? PROD_DB_PATH : path.resolve("./data/demo.db");
}

export function guardTarget(resolved: string, env: NodeJS.ProcessEnv = process.env): void {
  if (resolved === PROD_DB_PATH && env.PREPROD_RESEED !== "1" && env.ALLOW_PROD_SEED !== "1") {
    throw new Error("Refusing to reseed /data/app.db without PREPROD_RESEED=1 or ALLOW_PROD_SEED=1.");
  }
}

function main(): void {
  const resolved = targetPath();
  try {
    guardTarget(resolved);
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const { sqlite } = openDb(resolved);
  runMigrations(sqlite);
  const now = Date.now();
  const txn = sqlite.transaction(() => {
    sqlite.exec("DELETE FROM places; DELETE FROM users; DELETE FROM tag_definitions;");
    const insUser = sqlite.prepare(
      "INSERT INTO users (id, sub, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    );
    for (const u of FIXTURE_USERS) insUser.run(u.id, u.sub, u.displayName, now, now);
    const insPlace = sqlite.prepare(
      `INSERT INTO places (id, owner_id, google_place_id, name, address, lat, lng, status, icon,
        tags_json, rating, note, hours_json, business_status, price_level, price_range_json,
        google_rating, google_rating_count, website_uri, maps_links_json, utc_offset_minutes,
        created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`,
    );
    const seen = new Map<string, Set<string>>();
    for (const p of FIXTURE_PLACES) {
      insPlace.run(randomUUID(), p.owner, p.name, p.address, p.lat, p.lng, p.status, p.icon,
        JSON.stringify(p.tags), p.rating, now, now);
      if (!seen.has(p.owner)) seen.set(p.owner, new Set());
      for (const t of p.tags) seen.get(p.owner)!.add(t);
    }
    const insTag = sqlite.prepare(
      "INSERT INTO tag_definitions (owner_id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    );
    const palette = ["#D64545", "#8B5E34", "#7C5CBF", "#D9932B", "#2FA84F", "#0090FF"];
    let i = 0;
    for (const [owner, tags] of seen) {
      for (const name of [...tags].sort()) insTag.run(owner, name, palette[i++ % palette.length], now, now);
    }
  });
  txn();
  const users = (sqlite.prepare("SELECT COUNT(*) c FROM users").get() as any).c;
  const places = (sqlite.prepare("SELECT COUNT(*) c FROM places").get() as any).c;
  const tags = (sqlite.prepare("SELECT COUNT(*) c FROM tag_definitions").get() as any).c;
  sqlite.close();
  console.log(JSON.stringify({ db: resolved, users, places, tagDefinitions: tags }));
  if (users !== 2 || places !== 6) {
    console.error(`Unexpected fixture counts (users=${users} places=${places})`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();

export type { Database };
