"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  BuildingIcon,
  CalendarIcon,
  SparklesIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";

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
  { href: "/admin", label: "Ringkasan", exact: true, icon: LayoutDashboardIcon },
  { href: "/admin/properties", label: "Properti", exact: false, icon: BuildingIcon },
  { href: "/admin/bookings", label: "Pemesanan", exact: false, icon: CalendarIcon },
  { href: "/admin/cleaning", label: "Kebersihan", exact: false, icon: SparklesIcon },
  { href: "/admin/import", label: "Impor", exact: false, icon: UploadIcon },
  { href: "/admin/owners", label: "Pemilik", exact: false, icon: UsersIcon },
];

interface AdminSidebarProps {
  userName: string;
}

export function AdminSidebar({ userName }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b py-3">
        <Link
          href="/admin"
          className="flex items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <img
            src="/SPACE RENT.png"
            alt="Space Rent"
            className="size-8 min-w-8 shrink-0 rounded-full object-cover"
          />
          <span className="truncate text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Space Rent
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, label, exact, icon: Icon }) => {
                const isActive = exact
                  ? pathname === href
                  : pathname.startsWith(href);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={href} />}
                      tooltip={label}
                    >
                      <Icon />
                      <span>{label}</span>
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
