import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { chairDashboardService } from "../../services/chairDashboard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, ClipboardList, Award, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ChairDataPageLayout } from "../../components/chairs/ChairDataPageLayout"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { UserFilters, UserFilterValues } from "../../components/admin/UserFilters"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

const COL_COUNT = 3

type AwardDialogTarget = { id: string; name: string; currentAward: string | null }

export const AssignedDelegates: React.FC = () => {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<UserFilterValues>({})
  const [awardTarget, setAwardTarget] = useState<AwardDialogTarget | null>(null)
  const [awardInput, setAwardInput] = useState("")
  const [responseUserId, setResponseUserId] = useState<string | null>(null)
  const [responseUserName, setResponseUserName] = useState("")

  const { data: delegates = [], isLoading } = useQuery({
    queryKey: ["chair-assigned-delegates", filters],
    queryFn: () => chairDashboardService.getAssignedDelegates(filters as any),
  })

  const { data: settings } = useQuery({
    queryKey: ["registration-settings"],
    queryFn: () => chairDashboardService.getSettings(),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => chairDashboardService.removeDelegate(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chair-assigned-delegates"] })
      toast.success("Delegate removed from council.")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove delegate.")
    },
  })

  const addAwardMutation = useMutation({
    mutationFn: ({ userId, award }: { userId: string; award: string }) =>
      chairDashboardService.addAward(userId, award, null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chair-assigned-delegates"] })
      toast.success("Award saved.")
      setAwardTarget(null)
      setAwardInput("")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save award.")
    },
  })

  const removeAwardMutation = useMutation({
    mutationFn: (userId: string) => chairDashboardService.removeAward(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chair-assigned-delegates"] })
      toast.success("Award removed.")
      setAwardTarget(null)
      setAwardInput("")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove award.")
    },
  })

  const handleOpenAwardDialog = (d: { id: string; name: string; awards: string | null }) => {
    let current: string | null = null
    if (d.awards) {
      try {
        const parsed = JSON.parse(d.awards) as { title?: string }[]
        current = parsed.length > 0 ? parsed[0].title ?? null : null
      } catch {
        current = null
      }
    }
    setAwardTarget({ id: d.id, name: d.name, currentAward: current })
    setAwardInput(current ?? "")
  }

  const handleSaveAward = () => {
    const trimmed = awardInput.trim()
    if (!trimmed) {
      toast.error("Enter an award title.")
      return
    }
    if (!awardTarget) return
    addAwardMutation.mutate({ userId: awardTarget.id, award: trimmed })
  }

  const handleRemoveAwardInDialog = () => {
    if (!awardTarget?.currentAward) return
    removeAwardMutation.mutate(awardTarget.id)
  }

  const handleFiltersChange = (newFilters: UserFilterValues) => {
    setFilters(newFilters)
  }

  function parseAwardTitle(awardsJson: string | null): string | null {
    if (!awardsJson) return null
    try {
      const parsed = JSON.parse(awardsJson) as { title?: string }[]
      return parsed.length > 0 ? parsed[0].title ?? null : null
    } catch {
      return null
    }
  }

  return (
    <ChairDataPageLayout
      title="Assigned Delegates"
      description="Manage the delegates approved for your council."
      breadcrumbCurrent="Assigned"
      totalCount={delegates.length}
      isLoadingTotal={isLoading}
    >
      <UserFilters onFiltersChange={handleFiltersChange} />

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="w-[36%] pl-6 text-[11px] font-semibold tracking-caps text-muted-foreground">
                Delegate
              </TableHead>
              <TableHead className="text-[11px] font-semibold tracking-caps text-muted-foreground">
                Country
              </TableHead>
              <TableHead className="w-[1%] pr-6 text-right text-[11px] font-semibold tracking-caps text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="border-border/50">
                  <TableCell className="pl-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-36" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Skeleton className="h-3.5 w-28" />
                  </TableCell>
                  <TableCell className="pr-6 py-4 text-right">
                    <div className="flex justify-end gap-0.5">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : delegates.length === 0 ? (
              <TableRow className="border-0 hover:bg-transparent">
                <TableCell colSpan={COL_COUNT} className="p-0">
                  <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground/50">
                      <Users className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="max-w-xs space-y-1">
                      <p className="text-sm font-semibold text-foreground">No assigned delegates</p>
                      <p className="text-sm text-muted-foreground">
                        Approve requests to see delegates here.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              delegates.map((d: { id: string; name: string; email: string; country: string | null; awards: string | null }) => {
                const awardTitle = parseAwardTitle(d.awards)
                return (
                  <TableRow
                    key={d.id}
                    className="border-border/50 transition-colors hover:bg-muted/25"
                  >
                    <TableCell className="pl-6 align-middle">
                      <div className="flex flex-col gap-0.5 py-1">
                        <span className="text-sm font-medium text-foreground">{d.name}</span>
                        <span className="text-xs text-muted-foreground">{d.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-middle text-sm text-muted-foreground">
                      {d.country?.trim() ? d.country : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-6 align-middle">
                      <div className="flex justify-end gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant={awardTitle ? "outline" : "ghost"}
                              size="icon"
                              className={`h-8 w-8 shrink-0 ${awardTitle ? "border-primary/30 text-primary bg-primary/5" : "text-muted-foreground"}`}
                              onClick={() => handleOpenAwardDialog(d)}
                              aria-label={`Manage award for ${d.name}`}
                            >
                              <Award className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Manage award</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setResponseUserId(d.id)
                                setResponseUserName(d.name)
                              }}
                              aria-label={`View registration responses for ${d.name}`}
                            >
                              <ClipboardList className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Form responses</TooltipContent>
                        </Tooltip>
                        {!!settings?.chairs_can_reject && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => removeMutation.mutate(d.id)}
                                disabled={removeMutation.isPending}
                                aria-label={`Remove ${d.name} from council`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove from council</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!awardTarget}
        onOpenChange={(open) => {
          if (!open) {
            setAwardTarget(null)
            setAwardInput("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage award</DialogTitle>
            <DialogDescription>
              {awardTarget
                ? `Set the award for ${awardTarget.name}. Saving replaces any existing award.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="chair-award-input">Award</Label>
            <Input
              id="chair-award-input"
              value={awardInput}
              onChange={(e) => setAwardInput(e.target.value)}
              placeholder="e.g. Best Delegate"
              autoComplete="off"
            />
          </div>
          <div className="flex items-center gap-2 border-t border-border/60 pt-4">
            {awardTarget?.currentAward ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleRemoveAwardInDialog}
                    disabled={removeAwardMutation.isPending}
                    aria-label="Remove award"
                  >
                    {removeAwardMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remove award</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAwardTarget(null)
                setAwardInput("")
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveAward}
              disabled={addAwardMutation.isPending}
            >
              {addAwardMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save award"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChairDelegateResponseSheet
        userId={responseUserId}
        userName={responseUserName}
        onClose={() => setResponseUserId(null)}
      />
    </ChairDataPageLayout>
  )
}

function ChairDelegateResponseSheet({
  userId,
  userName,
  onClose,
}: {
  userId: string | null
  userName: string
  onClose: () => void
}) {
  const { data: response, isLoading } = useQuery({
    queryKey: ["chair-assigned-delegate-response", userId],
    queryFn: () => chairDashboardService.getResponse(userId!),
    enabled: !!userId,
  })

  return (
    <Sheet open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registration responses</SheetTitle>
          <SheetDescription>
            Full answers provided by {userName} during registration.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !response ? (
            <p className="text-sm italic text-muted-foreground">No responses found.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 border-b pb-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{response.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge
                    variant={
                      response.registrationStatus === "approved"
                        ? "success"
                        : response.registrationStatus === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {response.registrationStatus}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                {response.answers?.map(
                  (answer: { questionId: string; questionLabel: string; value: string | null }) => (
                    <div key={answer.questionId} className="space-y-1">
                      <p className="text-sm font-medium text-primary">{answer.questionLabel}</p>
                      <div className="rounded-md bg-muted/30 p-3 text-sm">
                        {answer.value || (
                          <span className="italic text-muted-foreground">No answer provided</span>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
