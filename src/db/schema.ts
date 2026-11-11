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
  placeType: text("place_type").notNull().default("restaurant"),
  tagsJson: text("tags_json").notNull().default("[]"),
  rating: real("rating"),
  note: text("note"),
  hoursJson: text("hours_json"),
  businessStatus: text("business_status"),
  priceLevel: text("price_level"),
  priceRangeJson: text("price_range_json"),
  googleRating: real("google_rating"),
  googleRatingCount: integer("google_rating_count"),
  websiteUri: text("website_uri"),
  mapsLinksJson: text("maps_links_json"),
  utcOffsetMinutes: integer("utc_offset_minutes"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const placeTypes = sqliteTable("place_types", {
  label: text("label").primaryKey(),
  color: text("color").notNull(),
  icon: text("icon").notNull().default("dot"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type PlaceRow = typeof places.$inferSelect;
export type PlaceTypeRow = typeof placeTypes.$inferSelect;
