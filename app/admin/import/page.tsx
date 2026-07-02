import { db } from "@/lib/db";
import { properties } from "@/db/schema";
import { ImportWizard } from "./import-wizard";

export default async function ImportPage() {
  const allProperties = await db.select().from(properties);
  return <ImportWizard properties={allProperties.map((p) => ({ id: p.id, name: p.name }))} />;
}
