import { db } from "../lib/db";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "admin123";

  const existing = await db.select().from(users).where(eq(users.username, username));
  if (existing.length > 0) {
    console.log(`Admin ${username} already exists, nothing to do.`);
    return;
  }

  await db.insert(users).values({
    username,
    passwordHash: bcrypt.hashSync(password, 10),
    name: "Admin",
    role: "admin",
  });
  console.log(`Admin created: ${username} / ${password} — change the password after first login.`);
}

main();
