"use server";

import { db } from "@/lib/db";
import { users, properties, bookings } from "@/db/schema";
import { createSession, destroySession, requireRole } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type ActionState = { error?: string } | undefined;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ---------- auth ----------

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "Username and password are required." };

  const user = (await db.select().from(users).where(eq(users.username, username)))[0];
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return { error: "Wrong username or password." };
  }

  await createSession({ uid: user.id, role: user.role, name: user.name });
  redirect(user.role === "admin" ? "/admin" : "/owner");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// ---------- properties ----------

export async function saveProperty(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = Number(formData.get("id")) || 0;
  const name = String(formData.get("name") ?? "").trim();
  const ownerId = Number(formData.get("ownerId")) || null;
  const commissionPct = Number(formData.get("commissionPct"));
  if (!name) return { error: "Name is required." };
  if (!Number.isFinite(commissionPct) || commissionPct < 0 || commissionPct > 100) {
    return { error: "Commission must be between 0 and 100." };
  }

  if (id) {
    await db.update(properties).set({ name, ownerId, commissionPct }).where(eq(properties.id, id));
  } else {
    await db.insert(properties).values({ name, ownerId, commissionPct });
  }
  revalidatePath("/admin", "layout");
}

export async function deleteProperty(id: number) {
  await requireRole("admin");
  await db.delete(bookings).where(eq(bookings.propertyId, id));
  await db.delete(properties).where(eq(properties.id, id));
  revalidatePath("/admin", "layout");
}

// ---------- owners ----------

export async function saveOwner(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = Number(formData.get("id")) || 0;
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!name || !username) return { error: "Name and username are required." };
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    return { error: "Username must be 3-30 characters: letters, numbers, dots, dashes." };
  }
  if (!id && password.length < 8) return { error: "Password must be at least 8 characters." };
  if (id && password && password.length < 8) return { error: "Password must be at least 8 characters." };

  const taken = (await db.select().from(users).where(eq(users.username, username)))[0];
  if (taken && taken.id !== id) return { error: "That username is already taken." };

  if (id) {
    await db
      .update(users)
      .set({ name, username, ...(password ? { passwordHash: bcrypt.hashSync(password, 10) } : {}) })
      .where(eq(users.id, id));
  } else {
    await db.insert(users).values({
      name,
      username,
      passwordHash: bcrypt.hashSync(password, 10),
      role: "owner",
    });
  }
  revalidatePath("/admin", "layout");
}

export async function deleteOwner(id: number): Promise<ActionState> {
  await requireRole("admin");
  const owned = await db.select().from(properties).where(eq(properties.ownerId, id));
  if (owned.length > 0) {
    return { error: "This owner still has properties assigned. Reassign them first." };
  }
  await db.delete(users).where(and(eq(users.id, id), eq(users.role, "owner")));
  revalidatePath("/admin", "layout");
}

// ---------- bookings ----------

export async function saveBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = Number(formData.get("id")) || 0;
  const propertyId = Number(formData.get("propertyId")) || 0;
  const guestName = String(formData.get("guestName") ?? "").trim();
  const checkIn = String(formData.get("checkIn") ?? "");
  const checkOut = String(formData.get("checkOut") ?? "");
  const payoutIdr = Math.round(Number(formData.get("payoutIdr")));

  if (!propertyId) return { error: "Pick a property." };
  if (!ISO_DATE.test(checkIn) || !ISO_DATE.test(checkOut)) return { error: "Both dates are required." };
  const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000);
  if (nights <= 0) return { error: "Check-out must be after check-in." };
  if (!Number.isFinite(payoutIdr) || payoutIdr < 0) return { error: "Payout cannot be negative." };

  const values = { propertyId, guestName, checkIn, checkOut, nights, payoutIdr };
  if (id) {
    await db.update(bookings).set(values).where(eq(bookings.id, id));
  } else {
    await db.insert(bookings).values({ ...values, source: "manual" });
  }
  revalidatePath("/admin", "layout");
}

export async function deleteBooking(id: number) {
  await requireRole("admin");
  await db.delete(bookings).where(eq(bookings.id, id));
  revalidatePath("/admin", "layout");
}

// ---------- CSV import ----------

export type ImportRow = {
  propertyId: number;
  source: "airbnb" | "agoda";
  externalId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  payoutIdr: number;
};

export async function importBookings(rows: ImportRow[]): Promise<{ inserted: number; skipped: number } | { error: string }> {
  await requireRole("admin");
  const valid = rows.filter(
    (r) =>
      r.propertyId > 0 &&
      (r.source === "airbnb" || r.source === "agoda") &&
      ISO_DATE.test(r.checkIn) &&
      ISO_DATE.test(r.checkOut) &&
      r.nights > 0 &&
      r.payoutIdr >= 0 // Agoda booking exports carry no amount; 0 means "fill in later"
  );
  if (valid.length === 0) return { error: "No valid rows to import." };

  const result = await db
    .insert(bookings)
    .values(
      valid.map((r) => ({
        propertyId: r.propertyId,
        source: r.source,
        externalId: r.externalId || null,
        guestName: r.guestName,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        nights: r.nights,
        payoutIdr: r.payoutIdr,
      }))
    )
    .onConflictDoNothing();

  revalidatePath("/admin", "layout");
  const inserted = result.rowsAffected;
  return { inserted, skipped: rows.length - inserted };
}
