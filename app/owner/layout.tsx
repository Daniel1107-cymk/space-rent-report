import { requireRole } from "@/lib/auth";
import { logout } from "@/app/actions";
import { Button } from "@/components/ui/button";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("owner");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <p className="text-sm font-semibold tracking-tight">Rent Report</p>
          <form action={logout} className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{session.name}</span>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
