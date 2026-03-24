import React, { useState } from "react"
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom"
import { useAuthStore } from "../../hooks/useAuthStore"
import { ImpersonationBanner } from "../common/ImpersonationBanner"
import { Users, ShieldCheck, Gavel, LogOut, Menu, PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import brand from "@/config/brand"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const navItems = [
  { name: "Delegates", path: "/admin/delegates", icon: Users },
  { name: "OC members", path: "/admin/oc", icon: ShieldCheck },
  { name: "Chairs", path: "/admin/chairs", icon: Gavel },
] as const

function NavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void
  className?: string
}) {
  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label="Admin">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )
          }
        >
          <item.icon
            className="h-[1.125rem] w-[1.125rem] shrink-0 opacity-90"
            aria-hidden
          />
          {item.name}
        </NavLink>
      ))}
    </nav>
  )
}

export const AdminLayout: React.FC = () => {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("refresh_token")
    setUser(null)
    navigate("/admin/login")
  }

  const currentNav = navItems.find((i) => location.pathname.startsWith(i.path))
  const pageLabel = currentNav?.name ?? "Admin"

  const initials =
    user?.name
      ?.split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ImpersonationBanner />

      <div className="flex min-h-screen flex-col md:flex-row">
        {/* Desktop sidebar */}
        <aside
          className="hidden w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex"
          aria-label="Main navigation"
        >
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
            <img
              src={brand.logoPath}
              alt=""
              className="h-9 w-9 rounded-lg object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
                {brand.appName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Administration
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-6 p-4">
            <div>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Manage
              </p>
              <NavLinks />
            </div>
          </div>

          <div className="mt-auto border-t border-sidebar-border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-auto w-full justify-start gap-3 rounded-lg px-3 py-3 hover:bg-accent"
                  aria-label="Account menu"
                >
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium">
                      {user?.name ?? "Signed in"}
                    </p>
                    <p className="truncate text-xs capitalize text-muted-foreground">
                      {user?.role}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start" side="top">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-md md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(100%,20rem)] p-0">
                <SheetHeader className="border-b border-border px-6 py-5 text-left">
                  <div className="flex items-center gap-3">
                    <img
                      src={brand.logoPath}
                      alt=""
                      className="h-9 w-9 rounded-lg object-contain"
                    />
                    <div>
                      <SheetTitle className="text-left text-base">
                        {brand.appName}
                      </SheetTitle>
                      <p className="text-sm text-muted-foreground">
                        Administration
                      </p>
                    </div>
                  </div>
                </SheetHeader>
                <div className="flex flex-col gap-6 p-4">
                  <NavLinks onNavigate={() => setMobileOpen(false)} />
                  <Separator />
                  <Button
                    variant="outline"
                    className="justify-start gap-2"
                    onClick={() => {
                      setMobileOpen(false)
                      handleLogout()
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <PanelLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-semibold">{pageLabel}</span>
            </div>
          </header>

          <main className="flex-1 bg-muted/30">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
