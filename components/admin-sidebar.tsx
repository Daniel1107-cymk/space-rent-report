"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { logout } from "@/app/actions";

const navItems = [
  { href: "/admin", label: "Ringkasan", exact: true },
  { href: "/admin/properties", label: "Properti", exact: false },
  { href: "/admin/bookings", label: "Pemesanan", exact: false },
  { href: "/admin/cleaning", label: "Kebersihan", exact: false },
  { href: "/admin/import", label: "Impor", exact: false },
  { href: "/admin/owners", label: "Pemilik", exact: false },
];

interface AdminSidebarProps {
  userName: string;
}

export function AdminSidebar({ userName }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-4 py-3">
        <p className="text-sm font-semibold tracking-tight truncate">
          Laporan Sewa
        </p>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.href} />}
                      tooltip={item.label}
                    >
                      {item.label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3 gap-2">
        <p className="text-xs text-muted-foreground truncate px-1">{userName}</p>
        <div className="flex items-center gap-2">
          <ChangePasswordDialog />
          <form action={logout} className="flex-1">
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              Keluar
            </Button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
