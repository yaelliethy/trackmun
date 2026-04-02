import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { delegatesService } from "../../services/delegates"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Download, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { User } from "@trackmun/shared"

interface PaymentProofReviewModalProps {
  user: User | null
  isOpen: boolean
  onClose: () => void
}

export function PaymentProofReviewModal({
  user,
  isOpen,
  onClose,
}: PaymentProofReviewModalProps) {
  const queryClient = useQueryClient()
  const [depositStatus, setDepositStatus] = useState<"pending" | "paid">(
    (user?.depositPaymentStatus as "pending" | "paid") || "pending"
  )
  const [fullStatus, setFullStatus] = useState<"pending" | "paid">(
    (user?.fullPaymentStatus as "pending" | "paid") || "pending"
  )

  const paymentMutation = useMutation({
    mutationFn: async ({
      id,
      field,
      status,
    }: {
      id: string
      field: "depositPaymentStatus" | "fullPaymentStatus"
      status: "pending" | "paid"
    }) => {
      const payload: Record<string, "pending" | "paid"> = {}
      payload[field] = status
      await delegatesService.updatePaymentStatus(id, payload)
      await queryClient.refetchQueries({ queryKey: ["delegates"] })
      await queryClient.refetchQueries({ queryKey: ["delegate-profile"] })
    },
  })

  const handleStatusToggle = (
    field: "depositPaymentStatus" | "fullPaymentStatus",
    status: "pending" | "paid"
  ) => {
    if (!user) return
    paymentMutation.mutate(
      { id: user.id, field, status },
      {
        onSuccess: () => {
          if (field === "depositPaymentStatus") setDepositStatus(status)
          if (field === "fullPaymentStatus") setFullStatus(status)
          toast.success(
            `${field === "depositPaymentStatus" ? "Deposit" : "Full registration"} marked as ${status === "paid" ? "paid" : "pending"}`
          )
        },
        onError: () => {
          toast.error("Failed to update payment status")
        },
      }
    )
  }

  const getPaymentProofUrl = (key: string | null | undefined) => {
    if (!key) return null
    // R2 public URL pattern - adjust based on your R2 configuration
    return `https://mun-media.trackmun.r2.cloudflarestorage.com/${key}`
  }

  if (!user) return null

  const hasPaymentProof = !!user.paymentProofR2Key

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Payment Proof</DialogTitle>
          <DialogDescription>
            Review the uploaded payment proof for {user.name} and update payment status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Registration Status</p>
              <Badge
                variant={
                  user.registrationStatus === "approved"
                    ? "success"
                    : user.registrationStatus === "rejected"
                    ? "destructive"
                    : "secondary"
                }
              >
                {user.registrationStatus}
              </Badge>
            </div>
          </div>

          {/* Payment Proof Display */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Payment Proof Document</h4>
            {hasPaymentProof ? (
              <div className="relative rounded-md border bg-muted/30 overflow-hidden min-h-[300px] flex items-center justify-center">
                <img
                  src={getPaymentProofUrl(user.paymentProofR2Key) || undefined}
                  alt="Payment proof"
                  className="max-h-[400px] w-auto object-contain"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = "none"
                    const fallback = document.getElementById("payment-proof-fallback")
                    if (fallback) fallback.style.display = "flex"
                  }}
                />
                <div
                  id="payment-proof-fallback"
                  className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground"
                  style={{ display: "none" }}
                >
                  <ImageIcon className="h-12 w-12 mb-2" />
                  <p className="text-sm">Unable to load image</p>
                  <a
                    href={getPaymentProofUrl(user.paymentProofR2Key!) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2"
                  >
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download instead
                    </Button>
                  </a>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
                <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No payment proof uploaded yet</p>
              </div>
            )}
          </div>

          {/* Payment Status Controls */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-semibold">Update Payment Status</h4>

            {/* Deposit Status */}
            <div className="flex items-center justify-between p-3 rounded-md border">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Deposit Payment</p>
                <p className="text-xs text-muted-foreground">
                  {user.depositAmount ? `Amount: $${user.depositAmount}` : "No amount set"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={depositStatus === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    handleStatusToggle("depositPaymentStatus", "pending")
                  }
                  disabled={paymentMutation.isPending}
                  isLoading={
                    paymentMutation.isPending &&
                    paymentMutation.variables?.field === "depositPaymentStatus" &&
                    paymentMutation.variables?.status === "pending"
                  }
                >
                  Mark Pending
                </Button>
                <Button
                  variant={depositStatus === "paid" ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    handleStatusToggle("depositPaymentStatus", "paid")
                  }
                  disabled={paymentMutation.isPending}
                  isLoading={
                    paymentMutation.isPending &&
                    paymentMutation.variables?.field === "depositPaymentStatus" &&
                    paymentMutation.variables?.status === "paid"
                  }
                  className={depositStatus === "paid" ? "bg-success text-success-foreground hover:bg-success/90" : ""}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Paid
                </Button>
              </div>
            </div>

            {/* Full Registration Status */}
            <div className="flex items-center justify-between p-3 rounded-md border">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Full Registration</p>
                <p className="text-xs text-muted-foreground">
                  {user.fullAmount ? `Amount: $${user.fullAmount}` : "No amount set"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={fullStatus === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusToggle("fullPaymentStatus", "pending")}
                  disabled={paymentMutation.isPending}
                  isLoading={
                    paymentMutation.isPending &&
                    paymentMutation.variables?.field === "fullPaymentStatus" &&
                    paymentMutation.variables?.status === "pending"
                  }
                >
                  Mark Pending
                </Button>
                <Button
                  variant={fullStatus === "paid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusToggle("fullPaymentStatus", "paid")}
                  disabled={paymentMutation.isPending}
                  isLoading={
                    paymentMutation.isPending &&
                    paymentMutation.variables?.field === "fullPaymentStatus" &&
                    paymentMutation.variables?.status === "paid"
                  }
                  className={fullStatus === "paid" ? "bg-success text-success-foreground hover:bg-success/90" : ""}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Paid
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
