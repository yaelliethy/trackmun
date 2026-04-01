import React, { useState } from "react"
import { useAuthStore } from "../../hooks/useAuthStore"
import { LogOut, QrCode, Calendar, Award, User, Ticket, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { api } from "../../services/api"
import { ModeToggle } from "@/components/mode-toggle"
import { motion } from "framer-motion"
import brand from "@/config/brand"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import QRCode from "react-qr-code"
import { useQuery } from "@tanstack/react-query"
import { useTheme } from "next-themes"

interface DelegateProfile {
  userId: string
  email: string
  name: string
  country: string | null
  council: string | null
  pressAgency: string | null
  firstChoice: string | null
  secondChoice: string | null
  depositPaymentStatus: "pending" | "paid"
  fullPaymentStatus: "pending" | "paid"
  depositAmount: number | null
  fullAmount: number | null
  paymentProofR2Key: string | null
}

interface AttendanceRecord {
  id: string
  sessionLabel: string
  scannedAt: number
  attended: boolean
}

interface Benefit {
  id: string
  benefitType: string
  redeemedAt: number
}

interface Award {
  id: string
  awardType: string
  council: string
  givenAt: number
  notes?: string | null
}

async function safeDelegateList<T>(path: string): Promise<T[]> {
  try {
    return await api.get<T[]>(path)
  } catch {
    return []
  }
}

export const FullyPaidDashboard: React.FC = () => {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const { resolvedTheme } = useTheme()
  const isDarkQr = resolvedTheme === "dark"
  /** Modules only; background is transparent so the card shows through. */
  const qrFg = isDarkQr ? "#ffffff" : "#000000"
  const qrBg = "#00000000"

  const { data: profile } = useQuery({
    queryKey: ["delegate-profile"],
    queryFn: () => api.get<DelegateProfile>("/delegates/profile"),
    retry: false,
  })

  const { data: attendance = [], isPending: attendanceLoading } = useQuery({
    queryKey: ["delegate-attendance"],
    queryFn: () => safeDelegateList<AttendanceRecord>("/delegates/attendance"),
    retry: false,
  })

  const { data: benefits = [], isPending: benefitsLoading } = useQuery({
    queryKey: ["delegate-benefits"],
    queryFn: () => safeDelegateList<Benefit>("/delegates/benefits"),
    retry: false,
  })

  const { data: awards = [], isPending: awardsLoading } = useQuery({
    queryKey: ["delegate-awards"],
    queryFn: () => safeDelegateList<Award>("/delegates/awards"),
    retry: false,
  })

  const listLoading = attendanceLoading || benefitsLoading || awardsLoading

  const handleLogout = async () => {
    try {
      await api.post("/auth/sign-out", {})
    } catch { }
    localStorage.removeItem("auth_token")
    localStorage.removeItem("refresh_token")
    setUser(null)
    navigate("/login")
  }

  if (!user) return null

  // Generate unique identifier: [COUNCIL ACRONYM]-[4-digit random number based on user ID]
  // Extract committee acronym from council name (e.g., "Human Rights Council" -> "HRC")
  const getCouncilAcronym = (council: string): string => {
    // Common UN council acronyms
    const acronyms: Record<string, string> = {
      'human rights council': 'HRC',
      'disarmament and international security': 'DISEC',
      'special political and decolonization': 'SPECPOL',
      'economic and financial': 'ECOFIN',
      'social humanitarian cultural': 'SOCHUM',
      'legal': 'LEGAL',
      'security council': 'UNSC',
      'economic and social council': 'ECOSOC',
      'general assembly': 'GA',
    }
    const lower = council.toLowerCase()
    for (const [key, value] of Object.entries(acronyms)) {
      if (lower.includes(key)) return value
    }
    // Fallback: use first letters of each word
    return council.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').toUpperCase().slice(0, 4)
  }

  const councilAcronym = profile?.council ? getCouncilAcronym(profile.council) : 'DELEGATE'
  // Generate consistent 4-digit number from user ID
  const delegateNumber = user?.id
    ? (Math.abs(user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 10000)
      .toString().padStart(4, '0'))
    : '0000'
  const uniqueId = `${councilAcronym}-${delegateNumber}`

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
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* QR Code Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={() => setQrDialogOpen(true)}
              className="w-full group"
            >
              <div className="relative aspect-square max-w-[280px] mx-auto bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-6 group-hover:from-primary/15 group-hover:via-primary/8 group-hover:to-primary/15 transition-all duration-300 shadow-sm group-hover:shadow-md">
                {/* Decorative corners */}
                <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary/30 rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary/30 rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-primary/30 rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-primary/30 rounded-br-lg" />

                {/* QR Code */}
                {/* <div className="relative flex h-full items-center justify-center rounded-xl bg-transparent p-4"> */}
                <QRCode
                  value={user?.id || uniqueId}
                  size={180}
                  level="M"
                  fgColor={qrFg}
                  bgColor={qrBg}
                  className="mx-auto p-4"
                />
                {/* </div> */}

                {/* Identifier below QR */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Delegate ID</p>
                  <p className="text-lg font-bold text-primary font-mono tracking-wider">{uniqueId}</p>
                </div>
                <p className="text-center text-xs text-muted-foreground mt-3 transition-colors">
                  Tap to view full size
                </p>
              </div>
            </button>
          </motion.div>

          {/* Personal Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="border-border/70">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-semibold">Personal Details</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{profile?.name || user?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{profile?.email || user?.email}</span>
                </div>
                {profile?.country && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Country</span>
                    <span className="font-medium">{profile.country}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Attendance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="border-border/70">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-semibold">Attendance</p>
                </div>
              </CardHeader>
              <CardContent>
                {listLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : attendance.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No attendance records yet</p>
                ) : (
                  <div className="space-y-2">
                    {attendance.map((record) => (
                      <div key={record.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                        <span className="text-foreground">{record.sessionLabel}</span>
                        <Badge variant={record.attended ? "success" : "secondary"} className="text-xs">
                          {record.attended ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Attended</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> Missed</>
                          )}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="border-border/70">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-semibold">Benefits Redeemed</p>
                </div>
              </CardHeader>
              <CardContent>
                {listLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : benefits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No benefits redeemed yet</p>
                ) : (
                  <div className="space-y-2">
                    {benefits.map((benefit) => (
                      <div key={benefit.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                        <span className="text-foreground">{benefit.benefitType}</span>
                        <span className="text-muted-foreground text-xs">
                          {new Date(benefit.redeemedAt * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Awards */}
          {awards.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <Card className="border-border/70">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm font-semibold">Awards</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {awards.map((award) => (
                      <div key={award.id} className="space-y-1 py-2 border-b last:border-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{award.awardType}</span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(award.givenAt * 1000).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{award.council}</p>
                        {award.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{award.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* QR Code Fullscreen Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold">Delegate QR Code</p>
                <p className="text-xs text-muted-foreground">Show this for scanning</p>
              </div>
            </div>

            {/* QR Code with decorative frame */}
            <div className="relative rounded-2xl bg-transparent p-6">
              {/* Corner accents */}
              {/* <div className="absolute top-3 left-3 w-10 h-10 border-l-4 border-t-4 border-primary/40 rounded-tl-xl" />
              <div className="absolute top-3 right-3 w-10 h-10 border-r-4 border-t-4 border-primary/40 rounded-tr-xl" />
              <div className="absolute bottom-3 left-3 w-10 h-10 border-l-4 border-b-4 border-primary/40 rounded-bl-xl" />
              <div className="absolute bottom-3 right-3 w-10 h-10 border-r-4 border-b-4 border-primary/40 rounded-br-xl" /> */}

              <div className="flex items-center justify-center">
                <QRCode
                  value={user?.id || uniqueId}
                  size={260}
                  level="M"
                  fgColor={qrFg}
                  bgColor={qrBg}
                />
              </div>
            </div>

            {/* Delegate ID */}
            <div className="mt-5 text-center space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Delegate Identifier</p>
              <p className="text-2xl font-bold text-primary font-mono tracking-widest">{uniqueId}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
