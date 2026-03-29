import React, { useState } from "react"
import { api } from "../../services/api"
import { User } from "@trackmun/shared"
import { useLocation, useNavigate, Link } from "react-router-dom"
import { useAuthStore } from "../../hooks/useAuthStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import brand from "@/config/brand"
import { motion } from "framer-motion"
import { AlertCircle, ArrowRight, Lock } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const { setUser } = useAuthStore()

  const fromPath =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/admin/delegates"

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const loginRes = await api.post<{ token: string; user: User }>(
        "/auth/sign-in/email",
        { email, password }
      )

      localStorage.setItem("refresh_token", loginRes.token)

      const tokenRes = await api.get<{ accessToken: string }>("/auth/token")
      localStorage.setItem("auth_token", tokenRes.accessToken)

      const user = loginRes.user

      if (user.role !== "admin") {
        localStorage.removeItem("auth_token")
        localStorage.removeItem("refresh_token")
        setError("Access denied. Administrator credentials required.")
        setLoading(false)
        return
      }

      setUser(user)
      const target =
        fromPath.startsWith("/admin") && fromPath !== "/admin/login"
          ? fromPath
          : "/admin/delegates"
      navigate(target, { replace: true })
    } catch {
      setError("Invalid email or password. Please check your credentials and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute right-4 top-4 z-50 sm:right-6 sm:top-6">
        <ModeToggle />
      </div>

      <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
        {/* ── Left: Admin brand panel ── */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:p-14"
        >
          {/* Fine dot grid texture */}
          <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-60" aria-hidden />
          <div className="auth-panel-line absolute left-[18%] inset-y-0 h-full" aria-hidden />
          <div className="auth-panel-line absolute right-[22%] inset-y-0 h-full opacity-40" aria-hidden />

          {/* Wordmark */}
          <div className="relative z-10 flex items-center gap-3">
            <img
              src={brand.logoPath}
              alt=""
              className="h-9 w-9 rounded-md bg-primary-foreground/10 p-1.5 object-contain"
            />
            <div>
              <p className="text-base font-semibold tracking-tight">{brand.appName}</p>
              <p className="text-xs text-primary-foreground/60 tracking-wide">
                Administration Console
              </p>
            </div>
          </div>

          {/* Main copy */}
          <div className="relative z-10 max-w-sm space-y-6">
            <div className="space-y-1">
              <p className="text-xs tracking-caps text-primary-foreground/50">
                Restricted Access
              </p>
              <h2 className="text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
                Manage your<br />conference operations.
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-primary-foreground/70">
              The administration console gives you complete oversight of
              delegates, staff, attendance, and conference configuration.
            </p>
            <div className="flex items-center gap-2.5 text-xs text-primary-foreground/50">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span>Protected area. Activity may be logged for security purposes.</span>
            </div>
          </div>

          <p className="relative z-10 text-[11px] text-primary-foreground/40">
            Administrator access only. Unauthorized entry is prohibited.
          </p>
        </motion.div>

        {/* ── Right: Form panel ── */}
        <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16 xl:px-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="mx-auto w-full max-w-sm space-y-10"
          >
            {/* Mobile wordmark */}
            <div className="flex items-center gap-3 lg:hidden">
              <img
                src={brand.logoPath}
                alt=""
                className="h-9 w-9 rounded-md border border-border object-contain p-1.5"
              />
              <div>
                <p className="text-sm font-semibold">{brand.appName}</p>
                <p className="text-xs text-muted-foreground">Administration Console</p>
              </div>
            </div>

            {/* Heading */}
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Administrator sign in
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter the credentials provided by your conference team.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@organization.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <Button
                type="submit"
                className="h-11 w-full font-semibold"
                isLoading={loading}
              >
                {!loading && (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              Are you a delegate?{" "}
              <Link
                to="/register"
                className="font-medium text-primary hover:underline underline-offset-4"
              >
                Create your account
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
