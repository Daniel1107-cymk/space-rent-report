import { requireRole } from "@/lib/auth";
import { logout } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { SparklesIcon } from "lucide-react";

export default async function CleaningLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("cleaner");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-emerald-500" />
            <p className="text-sm font-semibold tracking-tight">Space Rent — Kebersihan</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{session.name}</span>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                Keluar
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
