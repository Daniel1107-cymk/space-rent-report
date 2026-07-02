import { db } from "@/lib/db";
import { properties, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { OwnersTable } from "./owners-table";

export default async function OwnersPage() {
  const [owners, allProperties] = await Promise.all([
    db.select().from(users).where(eq(users.role, "owner")),
    db.select().from(properties),
  ]);

  return (
    <OwnersTable
      owners={owners.map((o) => ({
        id: o.id,
        name: o.name,
        username: o.username,
        propertyCount: allProperties.filter((p) => p.ownerId === o.id).length,
      }))}
    />
  );
}
