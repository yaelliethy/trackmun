import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { useAuthStore } from "../../hooks/useAuthStore"
import { api } from "../../services/api"
import { User } from "@trackmun/shared"

export const RootRedirect: React.FC = () => {
  const { user, setUser } = useAuthStore()
  const [redirectPath, setRedirectPath] = useState<string | null>(null)

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // If we already have user in store, use it
      if (user) {
        setRedirectPath(getRedirectPath(user.role))
        return
      }

      // Check if we have a token
      const token = localStorage.getItem("auth_token")
      if (!token) {
        // No token, redirect to login (NOT admin login!)
        setRedirectPath("/login")
        return
      }

      // Try to fetch user data
      try {
        const userData = await api.get<User>("/auth/me")
        setUser(userData)
        setRedirectPath(getRedirectPath(userData.role))
      } catch (err) {
        console.error("Failed to fetch user data during root redirect:", err)
        // Clear tokens on error
        localStorage.removeItem("auth_token")
        localStorage.removeItem("refresh_token")
        localStorage.removeItem("impersonation_token")
        localStorage.removeItem("impersonated_user")
        setUser(null)
        setRedirectPath("/login")
      }
    }

    void checkAuthAndRedirect()
  }, [user, setUser])

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

function getRedirectPath(role: string): string {
  switch (role) {
    case "admin":
    case "chair":
    case "oc":
      return "/admin/delegates"
    case "delegate":
      return "/delegate/dashboard"
    default:
      return "/login"
  }
}
