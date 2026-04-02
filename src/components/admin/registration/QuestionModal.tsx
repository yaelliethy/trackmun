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
import { RegistrationQuestion } from "@trackmun/shared"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

const questionSchema = z.object({
  label: z.string().min(1, "Label is required"),
  type: z.enum(['text', 'long_text', 'choices', 'dropdown', 'council_preference']),
  options: z.string().optional(),
  required: z.boolean(),
  councilPreferenceCount: z.coerce.number().int().min(1).optional(),
})

export type QuestionFormData = z.infer<typeof questionSchema>

export interface QuestionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: QuestionFormData) => Promise<void>
  question?: RegistrationQuestion | null
  stepId: string
  /** When true, "council preference" is hidden (only one allowed for the whole form). */
  hideCouncilPreferenceType?: boolean
}

export function QuestionModal({
  isOpen,
  onClose,
  onSave,
  question,
  hideCouncilPreferenceType = false,
}: QuestionModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      label: "",
      type: "text",
      options: "",
      required: true,
      councilPreferenceCount: 1,
    },
  })

  const type = watch("type")

  useEffect(() => {
    if (isOpen) {
      if (question) {
        reset({
          label: question.label,
          type: question.type,
          options: question.options || "",
          required: question.required,
          councilPreferenceCount: question.councilPreferenceCount ?? 1,
        })
      } else {
        reset({ label: "", type: "text", options: "", required: true, councilPreferenceCount: 1 })
      }
    }
  }, [isOpen, question, reset])

  const onSubmit = async (data: QuestionFormData) => {
    await onSave(data)
    onClose()
  }

  const requiresOptions = type === 'choices' || type === 'dropdown'
  const isCouncilPreference = type === 'council_preference'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{question ? "Edit Question" : "Add Question to Step"}</DialogTitle>
          <DialogDescription>
            Configure how this question appears to delegates. Order is controlled on the form builder.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Question Label</Label>
            <Input id="label" {...register("label")} placeholder="e.g. What is your dietary requirement?" />
            {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Input Type</Label>
            <Select value={type} onValueChange={(val: QuestionFormData['type']) => setValue("type", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Short Text</SelectItem>
                <SelectItem value="long_text">Paragraph Text</SelectItem>
                <SelectItem value="choices">Multiple Choice (Radio)</SelectItem>
                <SelectItem value="dropdown">Dropdown Select</SelectItem>
                {!hideCouncilPreferenceType && (
                  <SelectItem value="council_preference">
                    Council preferences (ranked, mutually exclusive)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
            {hideCouncilPreferenceType && (
              <p className="text-xs text-muted-foreground">
                You can only add one council preference field for the whole registration form. Remove or
                change the existing one to add another.
              </p>
            )}
          </div>

          {requiresOptions && (
            <div className="space-y-2">
              <Label htmlFor="options">Options (comma separated)</Label>
              <Input id="options" {...register("options")} placeholder="e.g. Vegetarian, Vegan, None" />
              {errors.options && <p className="text-xs text-destructive">{errors.options.message}</p>}
              <p className="text-xs text-muted-foreground">List options separated by commas.</p>
            </div>
          )}

          {isCouncilPreference && (
            <div className="space-y-2">
              <Label htmlFor="councilPreferenceCount">Number of council preferences</Label>
              <Input
                id="councilPreferenceCount"
                type="number"
                min={1}
                {...register("councilPreferenceCount", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                Delegates will rank this many choices (1st, 2nd, …). Each selection must be a different council.
              </p>
              {errors.councilPreferenceCount && (
                <p className="text-xs text-destructive">{errors.councilPreferenceCount.message}</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-4 mb-2">
            <Checkbox
              id="required"
              checked={watch("required")}
              onCheckedChange={(c) => setValue("required", c === true)}
            />
            <Label htmlFor="required" className="cursor-pointer">This question is required</Label>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Question"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
