import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { benefitsService } from "../../services/benefits"
import { AdminDataPageLayout } from "../../components/admin/AdminDataPageLayout"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const AdminBenefitsPage: React.FC = () => {
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [newName, setNewName] = useState("")

  const queryClient = useQueryClient()

  const { data: benefits = [], isLoading } = useQuery({
    queryKey: ["benefits"],
    queryFn: benefitsService.list,
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => benefitsService.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["benefits"] })
      setCreating(false)
      setNewName("")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => benefitsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["benefits"] })
      setDeletingId(null)
    },
  })

  return (
    <AdminDataPageLayout
      title="Benefits"
      description="Manage benefits that delegates can redeem once."
      breadcrumbCurrent="Benefits"
      action={
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Benefit
        </Button>
      }
    >
      <div className="rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Benefit Name</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : benefits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                  No benefits found.
                </TableCell>
              </TableRow>
            ) : (
              benefits.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingId(b.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Benefit</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Lunch Ticket"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (newName.trim()) createMutation.mutate(newName.trim())
              }} 
              isLoading={createMutation.isPending}
            >
              Add Benefit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingId} onOpenChange={(val) => !val && setDeletingId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Benefit</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            Are you sure you want to delete this benefit? This action cannot be undone.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              isLoading={deleteMutation.isPending}
            >
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDataPageLayout>
  )
}
