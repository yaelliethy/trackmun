import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { councilsService } from "../../services/councils"
import { AdminDataPageLayout } from "../../components/admin/AdminDataPageLayout"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Pencil } from "lucide-react"
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
import type { Council } from "@trackmun/shared"

export const AdminCouncilsPage: React.FC = () => {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [editing, setEditing] = useState<Council | null>(null)
  const [editName, setEditName] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const { data: councils = [], isLoading } = useQuery({
    queryKey: ["admin-councils"],
    queryFn: councilsService.list,
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => councilsService.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-councils"] })
      setCreating(false)
      setNewName("")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      councilsService.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-councils"] })
      setEditing(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => councilsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-councils"] })
      setDeletingId(null)
    },
  })

  return (
    <AdminDataPageLayout
      title="Councils"
      description="Define committees and councils. These names are used when assigning chairs and delegates."
      breadcrumbCurrent="Councils"
      action={
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add council
        </Button>
      }
    >
      <div className="rounded-md border border-border/60 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="pl-6 text-[11px] font-semibold tracking-caps text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="w-[120px] pr-6 text-right text-[11px] font-semibold tracking-caps text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                  Loading councils…
                </TableCell>
              </TableRow>
            ) : councils.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                  No councils yet. Add one to use them in user assignments.
                </TableCell>
              </TableRow>
            ) : (
              councils.map((c) => (
                <TableRow key={c.id} className="border-border/50">
                  <TableCell className="pl-6 font-medium">{c.name}</TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setEditing(c)
                        setEditName(c.name)
                      }}
                      aria-label={`Edit ${c.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive/70 hover:bg-destructive/10"
                      onClick={() => setDeletingId(c.id)}
                      aria-label={`Delete ${c.name}`}
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

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add council</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="council-name">Council name</Label>
            <Input
              id="council-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Security Council"
              className="h-10"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(newName.trim())}
              disabled={!newName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit council</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="council-edit-name">Council name</Label>
            <Input
              id="council-edit-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-10"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editing) {
                  void updateMutation.mutateAsync({
                    id: editing.id,
                    name: editName.trim(),
                  })
                }
              }}
              disabled={!editName.trim() || updateMutation.isPending || !editing}
            >
              {updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete council</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This does not remove the name from existing user records. Remove or update those assignments separately if needed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deletingId) void deleteMutation.mutateAsync(deletingId)
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDataPageLayout>
  )
}
