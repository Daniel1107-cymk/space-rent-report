import { requireRole } from "@/lib/auth";
import { logout } from "@/app/actions";
import { NavLink } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { ChangePasswordDialog } from "@/components/change-password-dialog";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("admin");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <p className="text-sm font-semibold tracking-tight">Laporan Sewa</p>
          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            <NavLink href="/admin">Ringkasan</NavLink>
            <NavLink href="/admin/properties">Properti</NavLink>
            <NavLink href="/admin/bookings">Pemesanan</NavLink>
            <NavLink href="/admin/import">Impor</NavLink>
            <NavLink href="/admin/owners">Pemilik</NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{session.name}</span>
            <ChangePasswordDialog />
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                Keluar
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
