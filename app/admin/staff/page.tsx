import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { StaffTable } from "./staff-table";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staf — Admin Space Rent",
};

export default async function StaffPage() {
  const cleaners = await db.select().from(users).where(eq(users.role, "cleaner"));

  return (
    <StaffTable
      staff={cleaners.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
      }))}
    />
  );
}
