import React, { useState, useEffect } from "react"
import { User } from "@trackmun/shared"
import { useQuery } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { councilsService } from "../../services/councils"

const NONE = "__none__"

interface UserEditModalProps {
  user: User | null
  isOpen: boolean
  onClose: () => void
  onSave: (
    id: string,
    data: { name: string; council?: string | null }
  ) => Promise<void>
}

export const UserEditModal: React.FC<UserEditModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState("")
  const [council, setCouncil] = useState("")
  const [loading, setLoading] = useState(false)

  const showCouncilSelect =
    user?.role === "delegate" || user?.role === "chair"

  const { data: councilList = [], isLoading: councilsLoading } = useQuery({
    queryKey: ["admin-councils"],
    queryFn: councilsService.list,
    enabled: isOpen && showCouncilSelect,
  })

  useEffect(() => {
    if (user) {
      setName(user.name)
      setCouncil(user.council?.trim() ? user.council : "")
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    try {
      await onSave(user.id, {
        name,
        council: showCouncilSelect
          ? council.trim() === ""
            ? null
            : council.trim()
          : null,
      })
      onClose()
    } catch (err) {
      console.error("Failed to save user:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-6 py-6 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Edit user
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {showCouncilSelect
              ? "Update display name and council assignment. Email cannot be changed here."
              : "Update display name. Email cannot be changed here."}
          </DialogDescription>
          {user?.email ? (
            <p className="truncate pt-1 text-xs font-medium text-muted-foreground">
              {user.email}
            </p>
          ) : null}
        </DialogHeader>
        <div className="space-y-6 px-6 py-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Full name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="h-10"
              />
            </div>
            {showCouncilSelect && (
              <div className="grid gap-2">
                <Label htmlFor="edit-council">Council</Label>
                {councilsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading councils…</p>
                ) : (
                  <Select
                    value={council.trim() ? council : NONE}
                    onValueChange={(v) => setCouncil(v === NONE ? "" : v)}
                  >
                    <SelectTrigger id="edit-council" className="h-10">
                      <SelectValue placeholder="Select a council" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {councilList.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  Manage the list under Administration → Councils.
                </p>
              </div>
            )}
          </div>
        </div>
        <Separator />
        <DialogFooter className="flex flex-col-reverse gap-2 border-t border-border/60 bg-muted/10 px-6 py-4 sm:flex-row sm:justify-end sm:gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            isLoading={loading}
            className="w-full sm:w-auto"
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
