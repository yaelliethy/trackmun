import React, { useState } from "react"
import { User } from "@trackmun/shared"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

interface UserDeleteModalProps {
  user: User | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (id: string) => Promise<void>
}

export const UserDeleteModal: React.FC<UserDeleteModalProps> = ({
  user,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!user) return
    setLoading(true)
    try {
      await onConfirm(user.id)
      onClose()
    } catch (err) {
      console.error("Failed to delete user:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-6 py-6 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Delete user
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            This permanently removes the account from the directory. You cannot
            undo this action.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 py-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Irreversible</AlertTitle>
            <AlertDescription>
              <span className="font-medium text-foreground">
                {user?.name}
              </span>
              {user?.email ? (
                <span className="block pt-1 text-destructive/90">
                  {user.email}
                </span>
              ) : null}
            </AlertDescription>
          </Alert>
        </div>
        <Separator />
        <DialogFooter className="flex flex-col-reverse gap-2 border-t border-border/60 bg-muted/10 px-6 py-4 sm:flex-row sm:justify-end sm:gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleConfirm()}
            isLoading={loading}
            className="w-full sm:w-auto"
          >
            Delete user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
