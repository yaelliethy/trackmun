import { NavLink, useLocation } from "react-router-dom"
import type { User } from "@trackmun/shared"
import brand from "@/config/brand"
import { Users, ShieldCheck, Gavel, LogOut, ChevronsUpDown, Gift, CalendarRange, ShieldAlert } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

const navItems = [
  { name: "Delegates", path: "/admin/delegates", icon: Users },
  { name: "OC members", path: "/admin/oc", icon: ShieldCheck },
  { name: "Chairs", path: "/admin/chairs", icon: Gavel },
  { name: "Admins", path: "/admin/admins", icon: ShieldAlert },
  { name: "Benefits", path: "/admin/benefits", icon: Gift },
  { name: "Attendance", path: "/admin/attendance", icon: CalendarRange },
] as const

export interface AdminAppSidebarProps {
  user: User | null
  onLogout: () => void
}

export function AdminAppSidebar({ user, onLogout }: AdminAppSidebarProps) {
  const location = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()

  const initials =
    user?.name
      ?.split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?"

  const closeMobileIfNeeded = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink
                to="/admin/delegates"
                onClick={closeMobileIfNeeded}
                className="flex w-full items-center gap-2 overflow-hidden"
              >
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-sidebar-border bg-sidebar-primary text-sidebar-primary-foreground">
                  <img
                    src={brand.logoPath}
                    alt=""
                    className="size-full object-contain p-1"
                  />
                </div>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{brand.appName}</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Administration
                  </span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.path)
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={item.name}
                  >
                    <NavLink
                      to={item.path}
                      onClick={closeMobileIfNeeded}
                      className="flex w-full items-center gap-2"
                    >
                      <item.icon className="size-4 shrink-0" />
                      <span>{item.name}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg border border-sidebar-border">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary/15 text-xs font-semibold text-sidebar-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user?.name ?? "Signed in"}
                    </span>
                    <span className="truncate text-xs capitalize text-sidebar-foreground/70">
                      {user?.role}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-60" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[min(100%,var(--radix-dropdown-menu-trigger-width))] min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex flex-col gap-1 px-1 py-1.5">
                    <span className="text-sm font-medium">{user?.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => onLogout()}
                >
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
