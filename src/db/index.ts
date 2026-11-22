import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const MIGRATIONS = [
  {
    version: 1,
    name: "init users + places",
    sql: `
      CREATE TABLE IF NOT EXISTS __migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        sub TEXT NOT NULL UNIQUE,
        display_name TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS places (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        google_place_id TEXT,
        name TEXT NOT NULL,
        address TEXT,
        lat REAL,
        lng REAL,
        status TEXT NOT NULL DEFAULT 'WANT_TO_GO',
        tags_json TEXT NOT NULL DEFAULT '[]',
        rating REAL,
        note TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_places_owner ON places(owner_id);
    `,
  },
  {
    version: 2,
    name: "enrich places + place_types",
    sql: `
      ALTER TABLE places ADD COLUMN place_type TEXT NOT NULL DEFAULT 'restaurant';
      ALTER TABLE places ADD COLUMN hours_json TEXT;
      ALTER TABLE places ADD COLUMN business_status TEXT;
      ALTER TABLE places ADD COLUMN price_level TEXT;
      ALTER TABLE places ADD COLUMN price_range_json TEXT;
      ALTER TABLE places ADD COLUMN google_rating REAL;
      ALTER TABLE places ADD COLUMN google_rating_count INTEGER;
      ALTER TABLE places ADD COLUMN website_uri TEXT;
      ALTER TABLE places ADD COLUMN maps_links_json TEXT;
      ALTER TABLE places ADD COLUMN utc_offset_minutes INTEGER;
      CREATE TABLE IF NOT EXISTS place_types (
        label TEXT PRIMARY KEY,
        color TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT 'dot',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      INSERT OR IGNORE INTO place_types (label, color, icon, created_at, updated_at) VALUES
        ('restaurant', '#D64545', 'fork', 0, 0),
        ('café', '#8B5E34', 'cup', 0, 0),
        ('bar', '#7C5CBF', 'glass', 0, 0);
      UPDATE places SET place_type = 'restaurant' WHERE place_type IS NULL OR place_type = '';
    `,
  },
  {
    version: 3,
    name: "fixed place types restaurant/bar/café",
    sql: `
      UPDATE places SET place_type = 'café' WHERE lower(place_type) IN ('coffee', 'cafe', 'café', 'coffee shop');
      UPDATE places SET place_type = 'bar' WHERE lower(place_type) IN ('bars', 'pub');
      UPDATE places SET place_type = 'restaurant' WHERE lower(place_type) IN ('resto');
      UPDATE places SET place_type = 'restaurant' WHERE place_type NOT IN ('restaurant', 'bar', 'café');
      INSERT OR IGNORE INTO place_types (label, color, icon, created_at, updated_at) VALUES
        ('restaurant', '#D64545', 'fork', 0, 0),
        ('café', '#8B5E34', 'cup', 0, 0),
        ('bar', '#7C5CBF', 'glass', 0, 0);
      DELETE FROM place_types WHERE label NOT IN ('restaurant', 'bar', 'café');
    `,
  },
  {
    version: 4,
    name: "add bakery place type",
    sql: `
      INSERT OR IGNORE INTO place_types (label, color, icon, created_at, updated_at) VALUES
        ('bakery', '#D9932B', 'bread', 0, 0);
    `,
  },
  {
    version: 5,
    name: "placeType to icon",
    sql: `
      ALTER TABLE places ADD COLUMN icon TEXT NOT NULL DEFAULT 'fork';
      UPDATE places SET icon = 'coffee' WHERE lower(place_type) IN ('café', 'cafe', 'coffee', 'coffee shop');
      UPDATE places SET icon = 'croissant' WHERE lower(place_type) IN ('bakery', 'bakeries', 'boulangerie');
      UPDATE places SET icon = 'cocktail' WHERE lower(place_type) = 'bar';
      UPDATE places SET icon = 'fork' WHERE icon NOT IN ('fork','burger','pizza','soup','hotdog','bagel','croissant','ice-cream','cocktail','wine','beer','coffee');
      DROP TABLE IF EXISTS place_types;
      CREATE TABLE IF NOT EXISTS places_new (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        google_place_id TEXT,
        name TEXT NOT NULL,
        address TEXT,
        lat REAL,
        lng REAL,
        status TEXT NOT NULL DEFAULT 'WANT_TO_GO',
        icon TEXT NOT NULL DEFAULT 'fork',
        tags_json TEXT NOT NULL DEFAULT '[]',
        rating REAL,
        note TEXT,
        hours_json TEXT,
        business_status TEXT,
        price_level TEXT,
        price_range_json TEXT,
        google_rating REAL,
        google_rating_count INTEGER,
        website_uri TEXT,
        maps_links_json TEXT,
        utc_offset_minutes INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      INSERT OR IGNORE INTO places_new (id, owner_id, google_place_id, name, address, lat, lng, status, icon, tags_json, rating, note, hours_json, business_status, price_level, price_range_json, google_rating, google_rating_count, website_uri, maps_links_json, utc_offset_minutes, created_at, updated_at)
        SELECT id, owner_id, google_place_id, name, address, lat, lng, status, icon, tags_json, rating, note, hours_json, business_status, price_level, price_range_json, google_rating, google_rating_count, website_uri, maps_links_json, utc_offset_minutes, created_at, updated_at FROM places;
      DROP TABLE places;
      ALTER TABLE places_new RENAME TO places;
      CREATE INDEX IF NOT EXISTS idx_places_owner ON places(owner_id);
    `,
  },
  {
    version: 6,
    name: "user-owned tag definitions",
    sql: `
      CREATE TABLE IF NOT EXISTS tag_definitions (
        owner_id TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (owner_id, name)
      );
      CREATE INDEX IF NOT EXISTS idx_tag_definitions_owner ON tag_definitions(owner_id);
    `,
  },
  {
    version: 7,
    name: "place_tags join table",
    sql: `
      CREATE TABLE IF NOT EXISTS place_tags (
        owner_id TEXT NOT NULL,
        tag_name TEXT NOT NULL,
        place_id TEXT NOT NULL,
        PRIMARY KEY (owner_id, tag_name, place_id)
      );
      CREATE INDEX IF NOT EXISTS idx_place_tags_owner_tag ON place_tags(owner_id, tag_name);
      CREATE INDEX IF NOT EXISTS idx_place_tags_place ON place_tags(place_id);
      CREATE INDEX IF NOT EXISTS idx_places_owner_updated ON places(owner_id, updated_at DESC, id DESC);
    `,
  },
];

export interface DbHandle {
  sqlite: Database.Database;
  db: BetterSQLite3Database;
}

export function openDb(databasePath: string): DbHandle {
  const dir = path.dirname(databasePath);
  if (dir && dir !== "." && dir !== "/") fs.mkdirSync(dir, { recursive: true });
  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return { sqlite, db: drizzle(sqlite) };
}

export function runMigrations(sqlite: Database.Database): void {
  sqlite.exec(
    `CREATE TABLE IF NOT EXISTS __migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);`
  );
  const applied = new Set(
    sqlite.prepare(`SELECT version FROM __migrations`).all().map((r: any) => r.version as number)
  );
  const insert = sqlite.prepare(`INSERT INTO __migrations (version, applied_at) VALUES (?, ?)`);
  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue;
    const txn = sqlite.transaction(() => {
      sqlite.exec(m.sql);
      insert.run(m.version, Date.now());
    });
    txn();
  }
  backfillTagDefinitions(sqlite);
  backfillPlaceTags(sqlite);
}

const BACKFILL_PALETTE = [
  "#D64545", "#E67E22", "#D9932B", "#C9A227", "#8BA634", "#5BA829",
  "#2FA84F", "#12A594", "#0E9D9B", "#0090FF", "#3E63DD", "#6E56CF",
  "#8E4EC6", "#AD4E9D", "#D6409F", "#E93D82", "#F2555A", "#8B5E34",
  "#7C5CBF", "#6B7280", "#4D7C0F", "#0F766E", "#0E7490", "#1D4ED8",
  "#7C3AED", "#A21CAF", "#BE123C", "#9A3412", "#3F6212", "#134E4A",
  "#1E3A8A", "#581C87",
];

function backfillHash(name: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** One-time deterministic backfill: one definition per distinct own-place tag. Idempotent. */
export function backfillTagDefinitions(sqlite: Database.Database): void {
  try {
    sqlite.exec(
      `CREATE TABLE IF NOT EXISTS tag_definitions (
        owner_id TEXT NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
        PRIMARY KEY (owner_id, name)
      );`
    );
  } catch { return; }
  let rows: any[] = [];
  try {
    rows = sqlite.prepare(`SELECT owner_id, tags_json FROM places`).all() as any[];
  } catch { return; }
  const insert = sqlite.prepare(
    `INSERT OR IGNORE INTO tag_definitions (owner_id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
  );
  const txn = sqlite.transaction(() => {
    for (const r of rows) {
      const ownerId = (r as any).owner_id as string;
      if (!ownerId) continue;
      let tags: string[] = [];
      try { tags = JSON.parse((r as any).tags_json ?? "[]"); } catch { tags = []; }
      const seen = new Set<string>();
      for (const t of tags) {
        if (typeof t !== "string") continue;
        const name = t.trim().toLowerCase();
        if (!name || seen.has(name)) continue;
        seen.add(name);
        const color = BACKFILL_PALETTE[backfillHash(name) % BACKFILL_PALETTE.length];
        const now = Date.now();
        insert.run(ownerId, name, color, now, now);
      }
    }
  });
  try { txn(); } catch { /* ignore */ }
}

/** One-time backfill: join rows from tags_json. Idempotent. */
export function backfillPlaceTags(sqlite: Database.Database): void {
  try {
    sqlite.exec(
      `CREATE TABLE IF NOT EXISTS place_tags (
        owner_id TEXT NOT NULL, tag_name TEXT NOT NULL, place_id TEXT NOT NULL,
        PRIMARY KEY (owner_id, tag_name, place_id)
      );`
    );
  } catch { return; }
  let rows: any[] = [];
  try {
    rows = sqlite.prepare(`SELECT id, owner_id, tags_json FROM places`).all() as any[];
  } catch { return; }
  const insert = sqlite.prepare(
    `INSERT OR IGNORE INTO place_tags (owner_id, tag_name, place_id) VALUES (?, ?, ?)`
  );
  const txn = sqlite.transaction(() => {
    for (const r of rows) {
      const ownerId = (r as any).owner_id as string;
      const placeId = (r as any).id as string;
      if (!ownerId || !placeId) continue;
      let tags: string[] = [];
      try { tags = JSON.parse((r as any).tags_json ?? "[]"); } catch { tags = []; }
      const seen = new Set<string>();
      for (const t of tags) {
        if (typeof t !== "string") continue;
        const name = t.trim().toLowerCase();
        if (!name || seen.has(name)) continue;
        seen.add(name);
        insert.run(ownerId, name, placeId);
      }
    }
  });
  try { txn(); } catch { /* ignore */ }
}

/** Keep join in sync with a place's normalized tag list. */
export function syncPlaceTags(sqlite: Database.Database, ownerId: string, placeId: string, tags: string[]): void {
  try {
    const del = sqlite.prepare(`DELETE FROM place_tags WHERE owner_id = ? AND place_id = ?`);
    del.run(ownerId, placeId);
    const insert = sqlite.prepare(
      `INSERT OR IGNORE INTO place_tags (owner_id, tag_name, place_id) VALUES (?, ?, ?)`
    );
    const seen = new Set<string>();
    const txn = sqlite.transaction(() => {
      for (const raw of tags ?? []) {
        if (typeof raw !== "string") continue;
        const name = raw.trim().toLowerCase();
        if (!name || seen.has(name)) continue;
        seen.add(name);
        insert.run(ownerId, name, placeId);
      }
    });
    txn();
  } catch { /* ignore */ }
}

export function deletePlaceTags(sqlite: Database.Database, ownerId: string, placeId: string): void {
  try {
    sqlite.prepare(`DELETE FROM place_tags WHERE owner_id = ? AND place_id = ?`).run(ownerId, placeId);
  } catch { /* ignore */ }
}

export function dbHealth(sqlite: Database.Database): "ok" | "error" {
  try {
    sqlite.prepare(`SELECT 1`).get();
    return "ok";
  } catch {
    return "error";
  }
}
