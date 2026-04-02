import { NavLink, useLocation } from "react-router-dom"
import type { User } from "@trackmun/shared"
import brand from "@/config/brand"
import {
  Users,
  CalendarRange,
  FileText,
  LogOut,
  ChevronsUpDown,
} from "lucide-react"
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
  { name: "Assigned", path: "/chairs/assigned", icon: Users },
  { name: "Requests", path: "/chairs/requests", icon: FileText },
  { name: "Attendance", path: "/chairs/attendance", icon: CalendarRange },
] as const

export interface ChairsAppSidebarProps {
  user: User | null
  onLogout: () => void | Promise<void>
}

export function ChairsAppSidebar({ user, onLogout }: ChairsAppSidebarProps) {
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
                to="/chairs/assigned"
                onClick={closeMobileIfNeeded}
                className="flex w-full items-center gap-2.5 overflow-hidden"
              >
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded border border-sidebar-border bg-sidebar-primary/10 text-sidebar-primary-foreground">
                  <img
                    src={brand.logoPath}
                    alt=""
                    className="size-full object-contain p-1.5"
                  />
                </div>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold tracking-tight">
                    {brand.appName}
                  </span>
                  <span className="truncate text-[11px] text-sidebar-foreground/50 tracking-wide">
                    Chair Portal
                  </span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] tracking-caps text-sidebar-foreground/40">
            Manage
          </SidebarGroupLabel>
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
                      className="flex w-full items-center gap-2.5"
                    >
                      <item.icon className="size-4 shrink-0" />
                      <span className="text-sm">{item.name}</span>
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
                  <Avatar className="size-7 rounded border border-sidebar-border">
                    <AvatarFallback className="rounded bg-sidebar-primary/15 text-[11px] font-semibold text-sidebar-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate text-sm font-medium">
                      {user?.name ?? "Signed in"}
                    </span>
                    <span className="truncate text-[11px] capitalize text-sidebar-foreground/50">
                      {user?.role}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-3.5 shrink-0 opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[min(100%,var(--radix-dropdown-menu-trigger-width))] min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex flex-col gap-1 px-2 py-2">
                    <span className="text-sm font-medium">{user?.name}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => onLogout()}
                >
                  <LogOut className="mr-2 size-4" />
                  Sign out
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
