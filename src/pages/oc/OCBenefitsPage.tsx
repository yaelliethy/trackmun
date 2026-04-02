import React, { useState, useCallback } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { ocService } from "@/services/oc"
import { QRScanner } from "@/components/oc/QRScanner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Loader2, Gift, QrCode, User, Clock, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Benefit } from "@trackmun/shared"
import { format } from "date-fns"

export const OCBenefitsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("search")
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null)

  // Fetch all benefits
  const { data: allBenefits, isLoading: isLoadingBenefits } = useQuery({
    queryKey: ["oc", "benefits", "list"],
    queryFn: async () => {
      return await ocService.listBenefits()
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

  // Redeem benefit mutation
  const redeemBenefit = useMutation({
    mutationFn: async (delegateId: string) => {
      if (!selectedBenefit) throw new Error("No benefit selected")
      return await ocService.redeemBenefit({
        delegateId,
        benefitId: selectedBenefit.id,
      })
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Benefit redeemed!`, {
          description: `${data.benefitName} for ${data.delegateName}`,
        })
      } else if (data.alreadyRedeemed) {
        toast.info(`Already redeemed`, {
          description: `${data.benefitName} was redeemed on ${format(new Date(data.redeemedAt! * 1000), "PPp")}`,
        })
      }
      setSearchQuery("")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to redeem benefit")
    },
  })

  const handleScan = useCallback(
    (decodedText: string) => {
      if (!selectedBenefit) {
        toast.error("Please select a benefit first")
        return
      }
      // Prevent multiple immediate scans of the same ID
      if (redeemBenefit.isPending) return
      
      redeemBenefit.mutate(decodedText)
    },
    [selectedBenefit, redeemBenefit]
  )

  if (!selectedBenefit) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Benefit Redemptions</h1>
          <p className="text-sm text-muted-foreground">Select a benefit to start redeeming for delegates.</p>
        </div>

        {isLoadingBenefits ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="h-32 animate-pulse bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allBenefits?.map((benefit) => (
              <Card
                key={benefit.id}
                className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md active:scale-[0.98]"
                onClick={() => setSelectedBenefit(benefit)}
              >
                <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Gift className="size-6" />
                  </div>
                  <div className="grid gap-1">
                    <CardTitle className="text-lg">{benefit.name}</CardTitle>
                    <CardDescription>Click to start redeeming</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 -ml-2"
              onClick={() => setSelectedBenefit(null)}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Redeeming: {selectedBenefit.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground pl-10">Search or scan a delegate to redeem this benefit.</p>
        </div>

        <Card className="shrink-0 border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Gift className="size-4" />
            </div>
            <div className="grid gap-0.5 leading-none">
              <span className="text-[11px] font-semibold uppercase tracking-caps text-muted-foreground">
                Active Benefit
              </span>
              <span className="text-sm font-medium">{selectedBenefit.name}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Main Interface */}
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-sm grid-cols-2">
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
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 mt-[-8px] size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search delegate..."
                    className="pl-9 h-11"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {isSearching && <Loader2 className="absolute right-3 top-3 size-4 animate-spin text-muted-foreground" />}
                </div>

                <AnimatePresence mode="popLayout">
                  {searchQuery.length >= 2 && searchResults?.length === 0 && !isSearching && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center text-muted-foreground">
                      <p className="text-sm">No delegates found for "{searchQuery}"</p>
                    </motion.div>
                  )}
                  {searchResults?.length && searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid gap-2 overflow-hidden rounded-lg border bg-card"
                    >
                      {searchResults.map((d) => (
                        <div
                          key={d.userId}
                          className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-0"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <User className="size-4" />
                            </div>
                            <div className="grid min-w-0 gap-0.5">
                              <span className="text-sm font-medium leading-none truncate">{d.name}</span>
                              <span className="text-[10px] text-muted-foreground truncate">{d.identifier} • {d.council}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="h-8 gap-2"
                            disabled={redeemBenefit.isPending && redeemBenefit.variables === d.userId}
                            onClick={() => redeemBenefit.mutate(d.userId)}
                          >
                            {redeemBenefit.isPending && redeemBenefit.variables === d.userId ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Gift className="size-3" />
                            )}
                            Redeem
                          </Button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="scanner" className="m-0 flex flex-col items-center pt-4">
                <QRScanner onScan={handleScan} isScanning={activeTab === "scanner"} />
                <div className="mt-6 text-center max-w-xs">
                  <p className="text-xs text-muted-foreground">
                    Scan a delegate's QR code to immediately redeem <strong>{selectedBenefit.name}</strong>.
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="p-4">
              <CardTitle className="text-xs flex items-center gap-2 text-primary uppercase tracking-caps">
                <Clock className="size-3.5" />
                OC Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground leading-relaxed space-y-2">
              <p>• Currently redeeming: <strong>{selectedBenefit.name}</strong>.</p>
              <p>• Verify delegate identity matches the badge identifier.</p>
              <p>• Confirm items are only handed over after scanning successfully.</p>
              <p>• If a benefit shows already redeemed, check timestamp and refer to OC lead if disputed.</p>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={() => setSelectedBenefit(null)}
          >
            Switch Benefit
          </Button>
        </div>
      </div>
    </div>
  )
}
