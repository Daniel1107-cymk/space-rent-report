"use server";

import { db } from "@/lib/db";
import { users, properties, bookings } from "@/db/schema";
import { createSession, destroySession, requireRole, getSession } from "@/lib/auth";
import { syncAllProperties } from "@/lib/sync";
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
  if (!username || !password) return { error: "Username dan kata sandi wajib diisi." };

  const user = (await db.select().from(users).where(eq(users.username, username)))[0];
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return { error: "Username atau kata sandi salah." };
  }

  await createSession({ uid: user.id, role: user.role, name: user.name });
  if (user.role === "admin") redirect("/admin");
  if (user.role === "cleaner") redirect("/cleaning");
  redirect("/owner");
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
  const airbnbIcalUrl = String(formData.get("airbnbIcalUrl") ?? "").trim() || null;
  const agodaIcalUrl = String(formData.get("agodaIcalUrl") ?? "").trim() || null;
  if (!name) return { error: "Nama wajib diisi." };
  if (!Number.isFinite(commissionPct) || commissionPct < 0 || commissionPct > 100) {
    return { error: "Komisi harus bernilai antara 0 dan 100." };
  }
  for (const url of [airbnbIcalUrl, agodaIcalUrl]) {
    if (url && !/^https?:\/\//.test(url)) return { error: "URL iCal harus diawali http(s)://" };
  }

  const values = { name, ownerId, commissionPct, airbnbIcalUrl, agodaIcalUrl };
  if (id) {
    await db.update(properties).set(values).where(eq(properties.id, id));
  } else {
    await db.insert(properties).values(values);
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
  if (!name || !username) return { error: "Nama dan username wajib diisi." };
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    return { error: "Username harus terdiri dari 3-30 karakter: huruf, angka, titik, tanda hubung." };
  }
  if (!id && password.length < 8) return { error: "Kata sandi minimal harus 8 karakter." };
  if (id && password && password.length < 8) return { error: "Kata sandi minimal harus 8 karakter." };

  const taken = (await db.select().from(users).where(eq(users.username, username)))[0];
  if (taken && taken.id !== id) return { error: "Username tersebut sudah digunakan." };

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
    return { error: "Pemilik ini masih memiliki properti yang ditetapkan. Tetapkan ulang terlebih dahulu." };
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
  const rawSource = String(formData.get("source") ?? "manual");
  const source = (["manual", "airbnb", "agoda"] as const).find((s) => s === rawSource) ?? "manual";

  if (!propertyId) return { error: "Pilih properti." };
  if (!ISO_DATE.test(checkIn) || !ISO_DATE.test(checkOut)) return { error: "Kedua tanggal wajib diisi." };
  const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000);
  if (nights <= 0) return { error: "Tanggal check-out harus setelah tanggal check-in." };
  if (!Number.isFinite(payoutIdr) || payoutIdr < 0) return { error: "Pembayaran tidak boleh negatif." };

  const values = { propertyId, guestName, checkIn, checkOut, nights, payoutIdr, source };
  if (id) {
    await db.update(bookings).set(values).where(eq(bookings.id, id));
  } else {
    await db.insert(bookings).values(values);
  }
  revalidatePath("/admin", "layout");
}

export async function deleteBooking(id: number) {
  await requireRole("admin");
  await db.delete(bookings).where(eq(bookings.id, id));
  revalidatePath("/admin", "layout");
}

export async function markBookingCleaned(id: number) {
  await requireRole("admin", "cleaner");
  await db
    .update(bookings)
    .set({ cleanedAt: new Date().toISOString() })
    .where(eq(bookings.id, id));
  revalidatePath("/admin", "layout");
  revalidatePath("/cleaning", "layout");
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
  if (valid.length === 0) return { error: "Tidak ada baris valid untuk diimpor." };

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

// ---------- iCal sync ----------

export async function syncBookings(): Promise<{ inserted: number; errors: string[] }> {
  await requireRole("admin");
  const result = await syncAllProperties();
  revalidatePath("/admin", "layout");
  return result;
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Belum login." };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!currentPassword || !newPassword) return { error: "Semua kolom wajib diisi." };
  if (newPassword.length < 8) return { error: "Kata sandi baru minimal harus 8 karakter." };

  const user = (await db.select().from(users).where(eq(users.id, session.uid)))[0];
  if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return { error: "Kata sandi saat ini salah." };
  }

  await db
    .update(users)
    .set({ passwordHash: bcrypt.hashSync(newPassword, 10) })
    .where(eq(users.id, session.uid));

  if (session.role === "admin") revalidatePath("/admin", "layout");
  else if (session.role === "cleaner") revalidatePath("/cleaning", "layout");
  else revalidatePath("/owner", "layout");
}

// ---------- staff (cleaner accounts) ----------

export async function saveStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = Number(formData.get("id")) || 0;
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !username) return { error: "Nama dan username wajib diisi." };
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    return { error: "Username harus terdiri dari 3-30 karakter: huruf, angka, titik, tanda hubung." };
  }
  if (!id && password.length < 8) return { error: "Kata sandi minimal harus 8 karakter." };
  if (id && password && password.length < 8) return { error: "Kata sandi minimal harus 8 karakter." };

  const taken = (await db.select().from(users).where(eq(users.username, username)))[0];
  if (taken && taken.id !== id) return { error: "Username tersebut sudah digunakan." };

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
      role: "cleaner",
    });
  }
  revalidatePath("/admin", "layout");
}

export async function deleteStaff(id: number): Promise<ActionState> {
  await requireRole("admin");
  await db.delete(users).where(and(eq(users.id, id), eq(users.role, "cleaner")));
  revalidatePath("/admin", "layout");
}
