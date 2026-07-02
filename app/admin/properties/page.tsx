import { db } from "@/lib/db";
import { properties, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PropertiesTable } from "./properties-table";

export default async function PropertiesPage() {
  const [allProperties, owners] = await Promise.all([
    db.select().from(properties),
    db.select().from(users).where(eq(users.role, "owner")),
  ]);

  return (
    <PropertiesTable
      properties={allProperties}
      owners={owners.map((o) => ({ id: o.id, name: o.name }))}
    />
  );
}
