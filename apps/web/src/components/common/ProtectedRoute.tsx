import React, { useEffect } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuthStore } from "../../hooks/useAuthStore"
import { api } from "../../services/api"
import { User } from "@trackmun/shared"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import brand from "@/config/brand"
import { supabase } from "../../lib/supabase"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string | string[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, setUser, isLoading, setLoading } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    const checkAuth = async () => {
      if (user) {
        setLoading(false)
        return
      }

      /**
       * Always resolve identity via the real Supabase JWT (skipImpersonation: true).
       * This guarantees `user` is always the logged-in admin, never the impersonated
       * target — which is what prevents the admin ProtectedRoute from receiving the
       * wrong role and bouncing the user to /403 the moment impersonation starts.
       */
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          // No real session. If there's a stale impersonation token, clear it.
          if (localStorage.getItem('impersonation_token')) {
            useAuthStore.getState().stopImpersonation()
          }
          setLoading(false)
          return
        }

        const userData = await api.get<User>("/auth/me", { skipImpersonation: true })

        // Double-check the session didn't disappear mid-flight (e.g. logout race).
        const { data: { session: sessionAfter } } = await supabase.auth.getSession()
        if (!sessionAfter) {
          setUser(null)
          return
        }

        setUser(userData)
      } catch (err) {
        console.error("Failed to fetch user data:", err)
        await supabase.auth.signOut()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    void checkAuth()
  }, [setUser, setLoading, user])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <div className="grid flex-1 gap-6 lg:grid-cols-[16rem_1fr]">
            <Card className="hidden border-border/60 shadow-sm lg:block">
              <CardHeader className="space-y-4">
                <Skeleton className="h-3 w-20" />
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </CardHeader>
            </Card>
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="space-y-3 border-b border-border/60 bg-muted/20">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full max-w-md" />
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                <div className="space-y-3 pt-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <p className="sr-only">Loading {brand.appName}…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  if (requiredRole && !allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}
