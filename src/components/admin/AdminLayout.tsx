import React from "react"
import { Outlet, useNavigate } from "react-router-dom"
import { useAuthStore } from "../../hooks/useAuthStore"
import { ImpersonationBanner } from "../common/ImpersonationBanner"
import { AdminAppSidebar } from "./AdminAppSidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useQueryClient, useIsFetching } from "@tanstack/react-query"

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuthStore()
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

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <ImpersonationBanner />
      <SidebarProvider className="flex min-h-0 min-w-0 flex-1 flex-row">
        <AdminAppSidebar user={user} onLogout={handleLogout} />
        <SidebarInset>
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-border/70 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <SidebarTrigger className="-ml-1 size-8" />
            <Separator orientation="vertical" className="mr-1 h-4 opacity-60" />
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={handleRefresh}
                title="Refresh dashboard data"
              >
                <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
              <ModeToggle />
            </div>
          </header>

          {/* Page content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto bg-muted/20">
              <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
                <Outlet />
              </div>
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
