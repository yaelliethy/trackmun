import React, { useState, useCallback } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { ocService } from "@/services/oc"
import { QRScanner } from "@/components/oc/QRScanner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, CheckCircle2, AlertCircle, CalendarRange, QrCode, User, Fingerprint } from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DelegateSearchResult } from "@trackmun/shared"
import { Skeleton } from "@/components/ui/skeleton"

export const OCAttendancePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("search")

  // Fetch active period
  const { data: activePeriod, isLoading: isLoadingPeriod } = useQuery({
    queryKey: ["oc", "attendance", "active"],
    queryFn: async () => {
      return await ocService.getActivePeriod()
    },
  })

  // Search delegates
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ["oc", "delegates", "search", searchQuery],
    queryFn: async () => {
      if (searchQuery.trim().length < 2) return []
      return await ocService.searchDelegates(searchQuery)
    },
    enabled: searchQuery.trim().length >= 2,
  })

  // Record attendance mutation
  const recordAttendance = useMutation({
    mutationFn: async (delegateId: string) => {
      if (!activePeriod) throw new Error("No active attendance period")
      return await ocService.recordAttendance({
        delegateId,
        periodId: activePeriod.periodId,
        sessionLabel: activePeriod.sessionLabel,
      })
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Attendance recorded for ${data.delegateName}`, {
          description: data.sessionLabel,
        })
      } else if (data.alreadyRecorded) {
        toast.info(`${data.delegateName} already recorded`, {
          description: data.sessionLabel,
        })
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record attendance")
    },
  })

  const handleScan = useCallback(
    (decodedText: string) => {
      recordAttendance.mutate(decodedText)
    },
    [recordAttendance]
  )

  return (
    <div className="space-y-6">
      {/* Header & Status */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Attendance Tracking</h1>
          <p className="text-sm text-muted-foreground">Manage delegate attendance for the current session.</p>
        </div>

        <Card className="min-w-[min(100%,220px)] shrink-0 border-primary/20 bg-primary/5">
          <CardContent className="flex min-h-[60px] items-center gap-3 p-3">
            {isLoadingPeriod ? (
              <>
                <Skeleton className="size-2.5 shrink-0 rounded-full" />
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <Skeleton className="h-3 w-28 max-w-full" />
                  <Skeleton className="h-4 w-44 max-w-full" />
                </div>
              </>
            ) : (
              <>
                <div
                  className={`size-2.5 shrink-0 rounded-full ${activePeriod ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"}`}
                />
                <div className="grid min-w-0 gap-0.5 leading-none">
                  <span className="text-[11px] font-semibold uppercase tracking-caps text-muted-foreground">
                    Current Session
                  </span>
                  <span className="text-sm font-medium">
                    {activePeriod ? activePeriod.sessionLabel : "No Active Period"}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="search" className="gap-2">
            <Search className="size-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="scanner" className="gap-2">
            <QrCode className="size-4" />
            Scanner
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="search" className="m-0 space-y-4">
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 mt-[-8px] size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or identifier (e.g. SC-001)..."
                className="pl-9 h-11"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isSearching && <Loader2 className="absolute right-3 top-3 size-4 animate-spin text-muted-foreground" />}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {searchResults?.map((delegate: DelegateSearchResult) => (
                  <motion.div
                    key={delegate.userId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                  >
                    <Card className="group relative overflow-hidden transition-all hover:border-primary/40 hover:shadow-md">
                      <CardHeader className="p-4 bg-muted/30">
                        <div className="flex items-start justify-between gap-2">
                          <div className="grid gap-1">
                            <CardTitle className="text-sm font-semibold">{delegate.name}</CardTitle>
                            <CardDescription className="text-xs truncate">{delegate.email}</CardDescription>
                          </div>
                          <Badge variant="outline" className="shrink-0 font-mono text-[10px] bg-background">
                            {delegate.identifier || "N/A"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CalendarRange className="size-3.5" />
                          <span>{delegate.council || "Independent"}</span>
                        </div>
                        <Button
                          className="w-full h-9 gap-2"
                          size="sm"
                          disabled={isLoadingPeriod || !activePeriod || recordAttendance.isPending}
                          onClick={() => recordAttendance.mutate(delegate.userId)}
                        >
                          {recordAttendance.isPending && recordAttendance.variables === delegate.userId ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="size-4" />
                          )}
                          Record Attendance
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              {searchQuery.length >= 2 && searchResults?.length === 0 && !isSearching && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  <User className="mx-auto size-12 opacity-20 mb-4" />
                  <h3 className="text-sm font-medium">No delegates found</h3>
                  <p className="text-xs opacity-60">No matches for "{searchQuery}"</p>
                </div>
              )}

              {searchQuery.length < 2 && (
                <div className="col-span-full border border-dashed rounded-xl py-20 text-center bg-muted/10">
                  <Fingerprint className="mx-auto size-14 text-muted-foreground/15" />
                  <p className="mt-4 text-sm text-muted-foreground/60">Type to search for delegates</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="scanner" className="m-0 flex flex-col items-center justify-center space-y-6 pt-4">
            {isLoadingPeriod ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <Loader2 className="size-10 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Checking current session…</p>
              </div>
            ) : !activePeriod ? (
              <div className="max-w-sm text-center space-y-3 py-12">
                <div className="mx-auto size-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="size-6 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold">Scanner Disabled</h3>
                <p className="text-sm text-muted-foreground">
                  No active attendance period detected. You can only record attendance during designated session times.
                </p>
              </div>
            ) : (
              <>
                <QRScanner onScan={handleScan} isScanning={activeTab === "scanner"} />
                <div className="grid max-w-sm text-center gap-2">
                  <h3 className="font-semibold flex items-center justify-center gap-2">
                    <QrCode className="size-4 text-primary" />
                    Scan QR Code
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed px-4">
                    Position the delegate's QR code within the frame to automatically record their attendance for the current session.
                  </p>
                </div>
              </>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
