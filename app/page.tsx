import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSession();
  redirect(!session ? "/login" : session.role === "admin" ? "/admin" : "/owner");
}
