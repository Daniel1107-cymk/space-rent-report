import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").$type<"admin" | "owner" | "cleaner">().notNull(),
});

export const properties = sqliteTable("properties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  ownerId: integer("owner_id").references(() => users.id),
  commissionPct: real("commission_pct").notNull().default(20),
  // iCal export URLs for auto-sync (dates only; payout filled in manually)
  airbnbIcalUrl: text("airbnb_ical_url"),
  agodaIcalUrl: text("agoda_ical_url"),
});

export const bookings = sqliteTable(
  "bookings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    propertyId: integer("property_id")
      .notNull()
      .references(() => properties.id),
    source: text("source").$type<"airbnb" | "agoda" | "manual">().notNull(),
    externalId: text("external_id"),
    guestName: text("guest_name"),
    // ISO YYYY-MM-DD strings: sortable, comparable, no timezone traps
    checkIn: text("check_in").notNull(),
    checkOut: text("check_out").notNull(),
    nights: integer("nights").notNull(),
    payoutIdr: integer("payout_idr").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    // Set when admin marks the unit as cleaned after guest checkout
    cleanedAt: text("cleaned_at"),
  },
  (t) => [
    // dedupe key for CSV re-imports; SQLite allows multiple NULLs so manual rows are unaffected
    uniqueIndex("bookings_source_external_id").on(t.source, t.externalId),
  ]
);

export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
