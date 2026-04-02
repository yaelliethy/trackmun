import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { useAuthStore } from "../../hooks/useAuthStore"
import { api } from "../../services/api"
import { User } from "@trackmun/shared"
import { supabase } from "../../lib/supabase"
import { getDefaultHomeForRole } from "../../utils/auth-redirect"

export const RootRedirect: React.FC = () => {
  const { user, setUser, isImpersonating, impersonatedUser } = useAuthStore()
  const [redirectPath, setRedirectPath] = useState<string | null>(null)

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // During impersonation, route based on the impersonated user's role
      if (isImpersonating && impersonatedUser) {
        setRedirectPath(getDefaultHomeForRole(impersonatedUser.role))
        return
      }

      // If we already have user in store, use it
      if (user) {
        setRedirectPath(getDefaultHomeForRole(user.role))
        return
      }

      // Try to get Supabase session
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setRedirectPath("/login")
          return
        }

        // Fetch the real admin identity — skip impersonation token so we get the
        // actual logged-in user, not the impersonated target.
        const userData = await api.get<User>("/auth/me", { skipImpersonation: true })
        setUser(userData)
        setRedirectPath(getDefaultHomeForRole(userData.role))
      } catch (err) {
        console.error("Failed to fetch user data during root redirect:", err)
        await supabase.auth.signOut()
        setUser(null)
        setRedirectPath("/login")
      }
    }

    void checkAuthAndRedirect()
  }, [user, setUser, isImpersonating, impersonatedUser])

  // Show loading state while checking
  if (!redirectPath) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to appropriate page
  return <Navigate to={redirectPath} replace />
}
