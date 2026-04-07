import React from "react"
import { Outlet, useNavigate, NavLink } from "react-router-dom"
import { useAuthStore } from "../../hooks/useAuthStore"
import { ImpersonationBanner } from "../common/ImpersonationBanner"
import { ModeToggle } from "@/components/mode-toggle"
import brand from "@/config/brand"
import { useQueryClient, useIsFetching } from "@tanstack/react-query"
import { Search, RefreshCw, LogOut } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

export const PressLayout: React.FC = () => {
  const { user, impersonatedUser, logout } = useAuthStore()
  const displayUser = impersonatedUser ?? user
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isFetching = useIsFetching()

  const handleLogout = async () => {
    await logout()
    navigate("/login", { replace: true })
  }

  const handleRefresh = () => {
    queryClient.refetchQueries()
  }

  const initials = displayUser?.name
    ? displayUser.name
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?"

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <ImpersonationBanner />

      {/* Sticky header bar */}
      <header className="sticky top-0 z-30 h-12 flex items-center gap-2 border-b bg-background/95 backdrop-blur px-4">
        {/* Left: Brand + Press */}
        <div className="flex items-center gap-2 shrink-0">
          <img src={brand.logoPath} alt={brand.appName} className="size-6" />
          <NavLink
            to="/feed"
            className="font-semibold text-sm hover:underline"
          >
            Press
          </NavLink>
        </div>

        {/* Center: Search */}
        <div
          className="flex-1 flex items-center gap-2 cursor-text max-w-md mx-auto"
          onClick={() => navigate("/feed/search")}
        >
          <Search className="size-4 text-muted-foreground shrink-0" />
          <Input
            readOnly
            placeholder="Search posts and people..."
            className="h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 placeholder:text-muted-foreground shadow-none"
          />
        </div>

        {/* Right: Actions + User */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            className="size-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            onClick={handleRefresh}
            title="Refresh"
          >
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>

          <ModeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 ml-1 p-1 rounded-md hover:bg-accent transition-colors">
                <Avatar className="size-7 rounded-full border">
                  <AvatarFallback className="rounded-full text-[11px] font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex flex-col gap-1 px-3 py-2">
                  <span className="text-sm font-medium">{displayUser?.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {displayUser?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={handleLogout}
              >
                <LogOut className="mr-2 size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-[600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
