import React from "react"
import { useAuthStore } from "../../hooks/useAuthStore"
import { FullyPaidDashboard } from "./FullyPaidDashboard"
import { LogOut, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { api } from "../../services/api"
import { ModeToggle } from "@/components/mode-toggle"
import { motion } from "framer-motion"
import brand from "@/config/brand"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useQuery } from "@tanstack/react-query"
import { PaymentProofUpload } from "../../components/delegate/PaymentProofUpload"

interface DelegateProfile {
  userId: string
  email: string
  name: string
  country: string | null
  pressAgency: string | null
  firstChoice: string | null
  secondChoice: string | null
  depositPaymentStatus: "pending" | "paid"
  fullPaymentStatus: "pending" | "paid"
  depositAmount: number | null
  fullAmount: number | null
  paymentProofR2Key: string | null
}

export const DelegateDashboardPage: React.FC = () => {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.post("/auth/sign-out", {})
    } catch { }
    localStorage.removeItem("auth_token")
    localStorage.removeItem("refresh_token")
    setUser(null)
    navigate("/login")
  }

  const { data: profile, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["delegate-profile"],
    queryFn: async () => api.get<DelegateProfile>("/delegates/profile"),
    retry: false,
  })

  // Check if fully paid (both deposit and full registration are explicitly "paid")
  const isFullyPaid =
    profile?.depositPaymentStatus === "paid" &&
    profile?.fullPaymentStatus === "paid"

  if (!user && !profile) return null

  // If fully paid, show the fully-paid dashboard
  // Only show if BOTH payment statuses are explicitly "paid"
  if (isFullyPaid) {
    return <FullyPaidDashboard />
  }

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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 w-8 p-0"
              title="Refresh payment status"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
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
          className="space-y-6"
        >
          {/* Welcome header */}
          <div className="space-y-1">
            <p className="text-xs tracking-caps text-muted-foreground">Delegate Portal</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome, {profile?.name || user?.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Your conference dashboard.
            </p>
          </div>

          {isLoading ? (
            <Card className="border-border/70">
              <CardHeader className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Registration Status Card */}
                <Card className="border-border/70">
                  <CardHeader className="space-y-1 pb-4">
                    <p className="text-[11px] tracking-caps text-muted-foreground">Registration</p>
                    <p className="text-sm font-semibold">Account Status</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Application</span>
                      <Badge
                        variant={
                          user?.registrationStatus === "approved"
                            ? "success"
                            : user?.registrationStatus === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                        className="font-mono text-[10px]"
                      >
                        {user?.registrationStatus?.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Country</span>
                      <span className="text-sm font-medium">
                        {profile?.country || <span className="text-muted-foreground/50">Not assigned</span>}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Status Card */}
                <Card className="border-border/70">
                  <CardHeader className="space-y-1 pb-4">
                    <p className="text-[11px] tracking-caps text-muted-foreground">Payments</p>
                    <p className="text-sm font-semibold">Financial Status</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Deposit {profile?.depositAmount ? `($${profile.depositAmount})` : ""}
                      </span>
                      <Badge
                        variant={profile?.depositPaymentStatus === "paid" ? "success" : "secondary"}
                        className="font-mono text-[10px]"
                      >
                        {profile?.depositPaymentStatus?.toUpperCase() || "PENDING"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Full Registration {profile?.fullAmount ? `($${profile.fullAmount})` : ""}
                      </span>
                      <Badge
                        variant={profile?.fullPaymentStatus === "paid" ? "success" : "secondary"}
                        className="font-mono text-[10px]"
                      >
                        {profile?.fullPaymentStatus?.toUpperCase() || "PENDING"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Proof Upload */}
              <PaymentProofUpload currentKey={profile?.paymentProofR2Key} />
            </>
          )}
        </motion.div>
      </main>
    </div>
  )
}
