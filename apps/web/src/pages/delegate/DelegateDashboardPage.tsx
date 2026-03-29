import React from "react"
import { useAuthStore } from "../../hooks/useAuthStore"
import { PaymentProofUpload } from "../../components/delegate/PaymentProofUpload"
import { Badge } from "@/components/ui/badge"
import brand from "@/config/brand"
import { LogOut, User2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { api } from "../../services/api"
import { ModeToggle } from "@/components/mode-toggle"
import { motion } from "framer-motion"

function StatusItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  )
}

export const DelegateDashboardPage: React.FC = () => {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.post("/auth/sign-out", {})
    } catch {}
    localStorage.removeItem("auth_token")
    localStorage.removeItem("refresh_token")
    setUser(null)
    navigate("/login")
  }

  if (!user) return null

  const depositStatus = (user as any).depositPaymentStatus || "pending"
  const fullStatus = (user as any).fullPaymentStatus || "pending"
  const depositAmount = (user as any).depositAmount || 0
  const fullAmount = (user as any).fullAmount || 0

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-12 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img
              src={brand.logoPath}
              alt=""
              className="h-7 w-7 rounded object-contain"
            />
            <span className="text-sm font-semibold tracking-tight">
              {brand.appName}
            </span>
            <span className="hidden text-xs text-muted-foreground/60 sm:inline">
              / Delegate Portal
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="h-8 gap-1.5 text-xs">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-10"
        >
          {/* Welcome header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs tracking-caps text-muted-foreground">Delegate Portal</p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Welcome, {user.firstName ?? user.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your conference registration and payments.
              </p>
            </div>
            <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User2 className="h-5 w-5" />
            </div>
          </div>

          {/* Status grid */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Registration card */}
            <div className="rounded-md border border-border/70 bg-card p-5 shadow-sm">
              <div className="mb-4 space-y-0.5">
                <p className="text-[11px] tracking-caps text-muted-foreground">Registration</p>
                <p className="text-sm font-semibold text-foreground">Account Status</p>
              </div>
              <StatusItem label="Application">
                <Badge
                  variant={
                    user.registrationStatus === "approved"
                      ? "success"
                      : user.registrationStatus === "rejected"
                      ? "destructive"
                      : "secondary"
                  }
                  className="font-mono text-[10px] tracking-wide"
                >
                  {user.registrationStatus?.toUpperCase()}
                </Badge>
              </StatusItem>
              <StatusItem label="Council Assignment">
                <span className="text-sm font-medium text-foreground">
                  {user.council?.trim() || (
                    <span className="text-muted-foreground/50">Not assigned</span>
                  )}
                </span>
              </StatusItem>
            </div>

            {/* Payments card */}
            <div className="rounded-md border border-border/70 bg-card p-5 shadow-sm">
              <div className="mb-4 space-y-0.5">
                <p className="text-[11px] tracking-caps text-muted-foreground">Payments</p>
                <p className="text-sm font-semibold text-foreground">Financial Status</p>
              </div>
              <StatusItem label={`Deposit${depositAmount ? ` (${depositAmount})` : ""}`}>
                <Badge
                  variant={depositStatus === "paid" ? "success" : "secondary"}
                  className="font-mono text-[10px] tracking-wide"
                >
                  {depositStatus.toUpperCase()}
                </Badge>
              </StatusItem>
              <StatusItem label={`Full registration${fullAmount ? ` (${fullAmount})` : ""}`}>
                <Badge
                  variant={fullStatus === "paid" ? "success" : "secondary"}
                  className="font-mono text-[10px] tracking-wide"
                >
                  {fullStatus.toUpperCase()}
                </Badge>
              </StatusItem>
            </div>
          </div>

          {/* Payment proof upload */}
          <PaymentProofUpload currentKey={(user as any).paymentProofR2Key} />
        </motion.div>
      </main>
    </div>
  )
}
