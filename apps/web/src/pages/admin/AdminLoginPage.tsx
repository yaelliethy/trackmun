import React, { useState } from "react"
import { api } from "../../services/api"
import { User } from "@trackmun/shared"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuthStore } from "../../hooks/useAuthStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import brand from "@/config/brand"
import { motion } from "framer-motion"
import { AlertCircle, ArrowRight, Shield } from "lucide-react"
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
        {
          email,
          password,
        }
      )

      localStorage.setItem("refresh_token", loginRes.token)

      const tokenRes = await api.get<{ accessToken: string }>("/auth/token")
      localStorage.setItem("auth_token", tokenRes.accessToken)

      const user = loginRes.user

      if (user.role !== "admin") {
        localStorage.removeItem("auth_token")
        localStorage.removeItem("refresh_token")
        setError("Access denied. Admin privileges required.")
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
      setError("Invalid email or password. Check your credentials and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute right-4 top-4 z-50 sm:right-6 sm:top-6">
        <ModeToggle />
      </div>
      <div className="grid min-h-screen lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:p-14"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            aria-hidden
          >
            <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary-foreground/10 blur-3xl" />
            <div className="absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-primary-foreground/5 blur-3xl" />
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <img
              src={brand.logoPath}
              alt=""
              className="h-11 w-11 rounded-xl bg-primary-foreground/10 p-2"
            />
            <div>
              <p className="text-lg font-semibold tracking-tight">
                {brand.appName}
              </p>
              <p className="text-sm text-primary-foreground/80">
                Conference operations, refined.
              </p>
            </div>
          </div>
          <div className="relative z-10 max-w-md space-y-8">
            <h2 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Sign in to the admin console
            </h2>
            <p className="text-base leading-relaxed text-primary-foreground/85">
              Manage delegates, OC, and chairs from one calm, focused workspace
              built for conference teams.
            </p>
            <ul className="space-y-4 text-sm text-primary-foreground/90">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <Shield className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="font-medium text-primary-foreground">
                    Role-aware access
                  </span>
                  <span className="block text-primary-foreground/75">
                    Only administrators can open this console.
                  </span>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="font-medium text-primary-foreground">
                    Pick up where you left off
                  </span>
                  <span className="block text-primary-foreground/75">
                    After sign-in you return to the page you tried to open.
                  </span>
                </span>
              </li>
            </ul>
          </div>
          <p className="relative z-10 text-xs text-primary-foreground/60">
            Protected area. Activity may be logged for security.
          </p>
        </motion.div>

        <div className="flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-12 xl:px-20">
          <div className="mx-auto w-full max-w-md space-y-8">
            <div className="flex items-center gap-3 lg:hidden">
              <img
                src={brand.logoPath}
                alt=""
                className="h-10 w-10 rounded-lg border border-border bg-card object-contain p-1.5"
              />
              <div>
                <p className="text-base font-semibold">{brand.appName}</p>
                <p className="text-sm text-muted-foreground">Admin sign in</p>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Welcome back
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                Enter your administrator email and password to continue.
              </p>
            </div>

            <Card className="border-border/80 shadow-lg shadow-primary/5">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl font-semibold">
                  Admin login
                </CardTitle>
                <CardDescription>
                  Use the credentials issued by your conference team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-5" noValidate>
                  {error ? (
                    <Alert variant="destructive" aria-live="assertive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Could not sign you in</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
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
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
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
                    className="h-11 w-full text-base font-semibold"
                    isLoading={loading}
                  >
                    Continue
                  </Button>
                </form>
              </CardContent>
            </Card>

            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Need access? Contact your conference administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
