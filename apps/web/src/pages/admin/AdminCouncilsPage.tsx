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
  const [newShortName, setNewShortName] = useState("")
  
  const [editing, setEditing] = useState<Council | null>(null)
  const [editName, setEditName] = useState("")
  const [editShortName, setEditShortName] = useState("")
  
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const { data: councils = [], isLoading } = useQuery({
    queryKey: ["admin-councils"],
    queryFn: councilsService.list,
  })

  const createMutation = useMutation({
    mutationFn: ({ name, shortName }: { name: string; shortName: string }) => 
      councilsService.create(name, shortName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-councils"] })
      setCreating(false)
      setNewName("")
      setNewShortName("")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name, shortName }: { id: string; name: string; shortName: string }) =>
      councilsService.update(id, name, shortName),
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
      description="Define committees and councils. The short name is used for delegate identifiers (e.g. SC-001)."
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
              <TableHead className="text-[11px] font-semibold tracking-caps text-muted-foreground">
                Short Name
              </TableHead>
              <TableHead className="w-[120px] pr-6 text-right text-[11px] font-semibold tracking-caps text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Loading councils…
                </TableCell>
              </TableRow>
            ) : councils.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No councils yet. Add one to use them in user assignments.
                </TableCell>
              </TableRow>
            ) : (
              councils.map((c) => (
                <TableRow key={c.id} className="border-border/50">
                  <TableCell className="pl-6 font-medium">{c.name}</TableCell>
                  <TableCell>
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                      {c.shortName}
                    </code>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="council-name">Full name</Label>
                  <Input
                    id="council-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Security Council"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="council-short">Short name (ID prefix)</Label>
                  <Input
                    id="council-short"
                    value={newShortName}
                    onChange={(e) => setNewShortName(e.target.value.toUpperCase())}
                    placeholder="e.g. SC"
                    className="h-10 font-mono"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createMutation.mutate({ name: newName.trim(), shortName: newShortName.trim() })}
                  disabled={!newName.trim() || !newShortName.trim() || createMutation.isPending}
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
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="council-edit-name">Full name</Label>
                  <Input
                    id="council-edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="council-edit-short">Short name (ID prefix)</Label>
                  <Input
                    id="council-edit-short"
                    value={editShortName}
                    onChange={(e) => setEditShortName(e.target.value.toUpperCase())}
                    className="h-10 font-mono"
                  />
                </div>
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
                        shortName: editShortName.trim(),
                      })
                    }
                  }}
                  disabled={!editName.trim() || !editShortName.trim() || updateMutation.isPending || !editing}
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
