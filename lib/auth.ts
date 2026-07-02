import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-secret-change-me"
);

export type Session = {
  uid: number;
  role: "admin" | "owner";
  name: string;
};

const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function createSession(session: Session) {
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      uid: payload.uid as number,
      role: payload.role as Session["role"],
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** Redirects to /login unless the session has the required role. */
export async function requireRole(role: Session["role"]): Promise<Session> {
  const session = await getSession();
  if (!session || session.role !== role) redirect("/login");
  return session;
}
