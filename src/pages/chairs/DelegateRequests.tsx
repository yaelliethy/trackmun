import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { chairDashboardService } from "../../services/chairDashboard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Check, X, ArrowRight, User, FileText } from "lucide-react"
import { toast } from "sonner"
import { ChairDataPageLayout } from "../../components/chairs/ChairDataPageLayout"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export const DelegateRequests: React.FC = () => {
  const queryClient = useQueryClient()
  const [viewingResponseUserId, setViewingResponseUserId] = useState<string | null>(null)
  const [viewingResponseUserName, setViewingResponseUserName] = useState<string>("")

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["chair-requests"],
    queryFn: () => chairDashboardService.getRequests(),
  })

  const { data: settings } = useQuery({
    queryKey: ["registration-settings"],
    queryFn: () => chairDashboardService.getSettings(),
  })

  const acceptMutation = useMutation({
    mutationFn: (userId: string) => chairDashboardService.acceptDelegate(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chair-requests"] })
      queryClient.invalidateQueries({ queryKey: ["chair-assigned-delegates"] })
      toast.success("Delegate accepted into council.")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to accept delegate.")
    }
  })

  const deferMutation = useMutation({
    mutationFn: (userId: string) => chairDashboardService.deferDelegate(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chair-requests"] })
      toast.success("Delegate deferred to their next preference.")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to defer delegate.")
    }
  })

  const rejectMutation = useMutation({
    mutationFn: (userId: string) => chairDashboardService.rejectDelegate(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chair-requests"] })
      toast.success("Delegate registration rejected.")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reject delegate.")
    }
  })

  return (
    <ChairDataPageLayout
      title="Delegate Requests"
      description="Manage pending registrations for your council."
      breadcrumbCurrent="Requests"
      totalCount={!isLoading ? requests.length : undefined}
      isLoadingTotal={isLoading}
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground/50">
            <User className="h-5 w-5" aria-hidden />
          </div>
          <div className="max-w-xs space-y-1">
            <p className="text-sm font-semibold text-foreground">No pending requests</p>
            <p className="text-sm text-muted-foreground">
              When new delegates pick this council, they will appear here.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-6 p-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {requests.map((req: any) => (
              <Card key={req.userId} className="flex flex-col h-full">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{req.name}</CardTitle>
                      <CardDescription className="truncate">{req.email}</CardDescription>
                    </div>
                    <Badge variant="secondary" className="shrink-0">Pending</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setViewingResponseUserId(req.userId)
                      setViewingResponseUserName(req.name)
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Registration Responses
                  </Button>
                </CardContent>
                <CardFooter className="border-t bg-muted/20 px-4 py-3 gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => acceptMutation.mutate(req.userId)}
                    disabled={acceptMutation.isPending}
                  >
                    {acceptMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <><Check className="h-3.5 w-3.5 mr-1.5"/> Accept</>}
                  </Button>

                  {!!settings?.chairs_can_defer && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs"
                      onClick={() => deferMutation.mutate(req.userId)}
                      disabled={deferMutation.isPending}
                    >
                      {deferMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <><ArrowRight className="h-3.5 w-3.5 mr-1.5"/> Defer</>}
                    </Button>
                  )}

                  {!!settings?.chairs_can_reject && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => rejectMutation.mutate(req.userId)}
                      disabled={rejectMutation.isPending}
                    >
                      {rejectMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <><X className="h-3.5 w-3.5 mr-1.5"/> Reject</>}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>

          <ChairDelegateResponseSheet
            userId={viewingResponseUserId}
            userName={viewingResponseUserName}
            onClose={() => setViewingResponseUserId(null)}
          />
        </>
      )}
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
    queryKey: ["chair-delegate-response", userId],
    queryFn: () => chairDashboardService.getResponse(userId!),
    enabled: !!userId,
  })

  return (
    <Sheet open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registration Responses</SheetTitle>
          <SheetDescription>
            Full answers provided by {userName} during registration.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !response ? (
            <p className="text-sm text-muted-foreground italic">No responses found.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4">
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
                {response.answers?.map((answer: any) => (
                  <div key={answer.questionId} className="space-y-1">
                    <p className="text-sm font-medium text-primary">
                      {answer.questionLabel}
                    </p>
                    <div className="rounded-md bg-muted/30 p-3 text-sm">
                      {answer.value || <span className="text-muted-foreground italic">No answer provided</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
