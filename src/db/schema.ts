import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // local user id (uuid)
  sub: text("sub").notNull().unique(), // OIDC subject
  displayName: text("display_name"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const places = sqliteTable("places", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  googlePlaceId: text("google_place_id"),
  name: text("name").notNull(),
  address: text("address"),
  lat: real("lat"),
  lng: real("lng"),
  status: text("status").notNull().default("WANT_TO_GO"),
  tagsJson: text("tags_json").notNull().default("[]"),
  rating: real("rating"),
  note: text("note"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type PlaceRow = typeof places.$inferSelect;
