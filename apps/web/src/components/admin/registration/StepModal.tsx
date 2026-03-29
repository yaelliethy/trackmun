import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { RegistrationStep } from "@trackmun/shared"

const stepSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
})

export type StepFormData = z.infer<typeof stepSchema>

export interface StepModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: StepFormData) => Promise<void>
  step?: RegistrationStep | null
}

export function StepModal({ isOpen, onClose, onSave, step }: StepModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StepFormData>({
    resolver: zodResolver(stepSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  })

  useEffect(() => {
    if (isOpen) {
      if (step) {
        reset({
          title: step.title,
          description: step.description || "",
        })
      } else {
        reset({ title: "", description: "" })
      }
    }
  }, [isOpen, step, reset])

  const onSubmit = async (data: StepFormData) => {
    await onSave(data)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{step ? "Edit Step" : "Add New Step"}</DialogTitle>
          <DialogDescription>
            Steps act as pages in the registration wizard. Reorder steps using drag-and-drop or the arrows on the form builder.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Step Title</Label>
            <Input id="title" {...register("title")} placeholder="e.g. Personal Information" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" {...register("description")} placeholder="Short instructions for this step" />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Step"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
