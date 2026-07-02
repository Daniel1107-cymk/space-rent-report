import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.role === "admin" ? "/admin" : "/owner");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-lg font-semibold tracking-tight">Rent Report</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to see your properties and payouts.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
