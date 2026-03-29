import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { attendanceService } from "../../services/attendance"
import { AdminDataPageLayout } from "../../components/admin/AdminDataPageLayout"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Clock, CalendarDays, AlertCircle } from "lucide-react"
import { ConferenceDay, AttendancePeriod } from "@trackmun/shared"
import { toast } from "sonner"
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
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

type AugmentedDay = ConferenceDay & { periods: AttendancePeriod[] }

export const AdminAttendancePage: React.FC = () => {
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingDay, setEditingDay] = useState<AugmentedDay | null>(null)
  const [newDate, setNewDate] = useState("")
  const [newName, setNewName] = useState("")

  // State for the periods modal
  const [localPeriods, setLocalPeriods] = useState<{ startTime: string; endTime: string }[]>([])

  const queryClient = useQueryClient()

  const { data: days = [], isLoading } = useQuery<AugmentedDay[]>({
    queryKey: ["attendance-days"],
    queryFn: attendanceService.listDays as any,
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; date: string }) => attendanceService.createDay(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-days"] })
      setCreating(false)
      setNewDate("")
      setNewName("")
      toast.success("Conference day created")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create day")
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => attendanceService.deleteDay(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-days"] })
      setDeletingId(null)
      toast.success("Conference day deleted")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete day")
    }
  })

  const replacePeriodsMutation = useMutation({
    mutationFn: (params: { dayId: string; periods: { startTime: string; endTime: string }[] }) =>
      attendanceService.replacePeriods(params.dayId, params.periods),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-days"] })
      setEditingDay(null)
      toast.success("Attendance periods updated")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update periods")
    }
  })

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const isDateInPast = newDate !== "" && newDate < today

  const periodError = useMemo(() => {
    for (let i = 0; i < localPeriods.length; i++) {
      const p = localPeriods[i]
      if (p.startTime >= p.endTime) {
        return `Period ${i + 1}: Start time must be before end time`
      }
      for (let j = i + 1; j < localPeriods.length; j++) {
        const other = localPeriods[j]
        if (p.startTime < other.endTime && other.startTime < p.endTime) {
          return `Period ${i + 1} and Period ${j + 1} overlap`
        }
      }
    }
    return null
  }, [localPeriods])

  const openEditModal = (day: AugmentedDay) => {
    setEditingDay(day)
    setLocalPeriods(day.periods.map(p => ({ startTime: p.startTime, endTime: p.endTime })))
  }

  const handleAddPeriod = () => {
    setLocalPeriods([...localPeriods, { startTime: "09:00", endTime: "17:00" }])
  }

  const handleRemovePeriod = (index: number) => {
    setLocalPeriods(localPeriods.filter((_, i) => i !== index))
  }

  const handlePeriodChange = (index: number, field: "startTime" | "endTime", value: string) => {
    const updated = [...localPeriods]
    updated[index] = { ...updated[index], [field]: value }
    setLocalPeriods(updated)
  }

  const handleSavePeriods = () => {
    if (!editingDay) return
    replacePeriodsMutation.mutate({ dayId: editingDay.id, periods: localPeriods })
  }

  return (
    <AdminDataPageLayout
      title="Attendance & Schedule"
      description="Manage conference days and configure valid attendance periods for each day."
      breadcrumbCurrent="Attendance"
      action={
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Conference Day
        </Button>
      }
    >
      <div className="rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Periods</TableHead>
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : days.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No conference days configured.
                </TableCell>
              </TableRow>
            ) : (
              days.map((day) => (
                <TableRow key={day.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-semibold">{day.name}</span>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm font-normal">
                        <CalendarDays className="h-4 w-4" />
                        {day.date}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {day.periods.length === 0 ? (
                      <span className="text-muted-foreground text-sm italic">No periods (attendance disabled)</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {day.periods.map((p, i) => (
                          <div key={i} className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                            <Clock className="h-3 w-3" />
                            {p.startTime} - {p.endTime}
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(day)}
                    >
                      Configure
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 ml-2"
                      onClick={() => setDeletingId(day.id)}
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

      {/* Add Day Modal */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Conference Day</DialogTitle>
            <DialogDescription>
              Enter the date for the new conference day. Format: YYYY-MM-DD.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newName}
                placeholder="e.g. Day 1: Opening Ceremony"
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className={isDateInPast ? "border-destructive" : ""}
              />
              {isDateInPast && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  Date must be today or in the future
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (newDate.trim() && newName.trim() && !isDateInPast) createMutation.mutate({ name: newName.trim(), date: newDate.trim() })
              }} 
              disabled={createMutation.isPending || !newDate.trim() || !newName.trim() || isDateInPast}
              isLoading={createMutation.isPending}
            >
              Add Day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Day Modal */}
      <Dialog open={!!deletingId} onOpenChange={(val) => !val && setDeletingId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Conference Day</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            Are you sure you want to delete this day? All attendance periods and records for this day will be removed. This cannot be undone.
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

      {/* Configure Periods Modal */}
      <Dialog open={!!editingDay} onOpenChange={(val) => !val && setEditingDay(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Periods: {editingDay?.date}</DialogTitle>
            <DialogDescription>
              Add valid attendance periods. If there are no periods, attendance taking is disabled for this day.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {localPeriods.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                <Clock className="mb-2 h-8 w-8 text-muted-foreground/50" />
                <p>No periods defined.</p>
                <p className="mt-1">Students cannot be marked present on this day.</p>
              </div>
            ) : (
              localPeriods.map((period, idx) => (
                <Card key={idx} className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="grid flex-1 gap-2">
                      <Label className="text-xs">Start Time</Label>
                      <Input 
                        type="time" 
                        value={period.startTime} 
                        onChange={(e) => handlePeriodChange(idx, "startTime", e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="grid flex-1 gap-2">
                      <Label className="text-xs">End Time</Label>
                      <Input 
                        type="time" 
                        value={period.endTime} 
                        onChange={(e) => handlePeriodChange(idx, "endTime", e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="mt-6 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemovePeriod(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
            <Button variant="outline" className="w-full border-dashed" onClick={handleAddPeriod}>
              <Plus className="mr-2 h-4 w-4" /> Add Period
            </Button>
            {periodError && (
              <p className="text-sm text-destructive flex items-center gap-2 bg-destructive/5 p-3 rounded-md border border-destructive/20">
                <AlertCircle className="size-4 shrink-0" />
                {periodError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDay(null)} disabled={replacePeriodsMutation.isPending}>
              Cancel
            </Button>
            <Button 
              onClick={handleSavePeriods}
              isLoading={replacePeriodsMutation.isPending}
              disabled={!!periodError || replacePeriodsMutation.isPending}
            >
              Save Periods
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDataPageLayout>
  )
}
