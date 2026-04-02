import React, { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { adminRegistrationService } from "../../services/registration"
import { AdminDataPageLayout } from "../../components/admin/AdminDataPageLayout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, GripVertical, Trash2, Edit, ChevronUp, ChevronDown } from "lucide-react"
import { StepModal } from "../../components/admin/registration/StepModal"
import { QuestionModal, type QuestionFormData } from "../../components/admin/registration/QuestionModal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RegistrationStep, RegistrationQuestion, type Settings } from "@trackmun/shared"
import { toast } from "sonner"

const REG_STEPS_QUERY_KEY = ["admin-registration-steps"] as const
const REG_QUESTIONS_QUERY_KEY = ["admin-registration-questions"] as const

function cloneSteps(steps: RegistrationStep[] | undefined): RegistrationStep[] | undefined {
  if (!steps) return undefined
  return steps.map((s) => ({ ...s }))
}

function cloneQuestions(
  questions: RegistrationQuestion[] | undefined
): RegistrationQuestion[] | undefined {
  if (!questions) return undefined
  return questions.map((q) => ({ ...q }))
}

export const AdminRegistrationPage: React.FC = () => {
  const { data: settings } = useQuery({
    queryKey: ["admin-registration-settings"],
    queryFn: () => adminRegistrationService.getSettings(),
  })

  return (
    <AdminDataPageLayout
      title="Registration Setup"
      description="Configure registration fees and dynamically build the delegate registration form structure."
      breadcrumbCurrent="Registration"
    >
      <div className="p-6">
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="mb-6 h-9 rounded-md bg-muted/60 p-1">
            <TabsTrigger value="settings" className="text-sm rounded-sm">
              Global Settings
            </TabsTrigger>
            <TabsTrigger value="form-builder" className="text-sm rounded-sm">
              Form Builder
            </TabsTrigger>
          </TabsList>
          <TabsContent value="settings">
            <SettingsTab settings={settings ?? {}} />
          </TabsContent>
          <TabsContent value="form-builder">
            <FormBuilderTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminDataPageLayout>
  )
}

function SettingsTab({ settings }: { settings: Settings }) {
  const [deposit, setDeposit] = useState(settings?.registration_deposit_amount?.toString() || "")
  const [full, setFull] = useState(settings?.registration_full_amount?.toString() || "")
  const [timing, setTiming] = useState<"registration" | "after_acceptance">(
    settings?.payment_proof_timing || "after_acceptance"
  )
  const [registrationOpen, setRegistrationOpen] = useState(
    settings?.registration_enabled !== false
  )
  const [chairsCanReject, setChairsCanReject] = useState(
    settings?.chairs_can_reject === true
  )
  const [chairsCanDefer, setChairsCanDefer] = useState(
    settings?.chairs_can_defer === true
  )
  const queryClient = useQueryClient()

  React.useEffect(() => {
    if (settings) {
      setDeposit(settings.registration_deposit_amount?.toString() || "")
      setFull(settings.registration_full_amount?.toString() || "")
      if (settings.payment_proof_timing) setTiming(settings.payment_proof_timing)
      setRegistrationOpen(settings.registration_enabled !== false)
      setChairsCanReject(settings.chairs_can_reject === true)
      setChairsCanDefer(settings.chairs_can_defer === true)
    }
  }, [settings])

  const saveFeesMutation = useMutation({
    mutationFn: () =>
      adminRegistrationService.updateSettings({
        registration_deposit_amount: parseInt(deposit, 10) || undefined,
        registration_full_amount: parseInt(full, 10) || undefined,
        payment_proof_timing: timing as "registration" | "after_acceptance",
        chairs_can_reject: chairsCanReject,
        chairs_can_defer: chairsCanDefer,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-registration-settings"] })
      toast.success("Settings saved successfully.")
    },
  })

  const toggleRegistrationMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      adminRegistrationService.updateSettings({ registration_enabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-registration-settings"] })
    },
  })

  const onRegistrationToggle = (checked: boolean) => {
    setRegistrationOpen(checked)
    toggleRegistrationMutation.mutate(checked)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global settings</CardTitle>
        <CardDescription>Fees, payment timing, and whether new delegates can register.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Label htmlFor="registration-open" className="text-base">
              Open registration for delegates
            </Label>
            <p className="text-sm text-muted-foreground">
              When off, the public registration endpoint rejects new sign-ups.
            </p>
          </div>
          <Switch
            id="registration-open"
            checked={registrationOpen}
            onCheckedChange={onRegistrationToggle}
            disabled={toggleRegistrationMutation.isPending}
            aria-label="Toggle delegate registration"
          />
        </div>

        <div className="space-y-4 border-t pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label htmlFor="chairs-can-reject" className="text-sm font-medium">
                Chairs can reject delegates
              </Label>
              <p className="text-xs text-muted-foreground">
                If enabled, chairs will see incoming registrations and can reject them directly.
              </p>
            </div>
            <Switch
              id="chairs-can-reject"
              checked={chairsCanReject}
              onCheckedChange={setChairsCanReject}
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label htmlFor="chairs-can-defer" className="text-sm font-medium">
                Chairs can defer delegates
              </Label>
              <p className="text-xs text-muted-foreground">
                If enabled, chairs can defer delegates to their next preferred council.
              </p>
            </div>
            <Switch
              id="chairs-can-defer"
              checked={chairsCanDefer}
              onCheckedChange={setChairsCanDefer}
            />
          </div>
        </div>

        <div className="space-y-4 border-t pt-6">
          <div className="space-y-2">
            <Label htmlFor="deposit_amount">Deposit amount (default currency)</Label>
            <Input
              id="deposit_amount"
              placeholder="e.g. 50"
              type="number"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_amount">Full amount (default currency)</Label>
            <Input
              id="full_amount"
              placeholder="e.g. 150"
              type="number"
              value={full}
              onChange={(e) => setFull(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2 border-t pt-4">
          <Label>Payment proof timing</Label>
          <p className="text-sm text-muted-foreground pb-2">
            When should delegates upload their proof of payment?
          </p>
          <Select
            value={timing}
            onValueChange={(val) => setTiming(val as "registration" | "after_acceptance")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select timing" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="registration">During registration (required to submit)</SelectItem>
              <SelectItem value="after_acceptance">After acceptance (delegate dashboard)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={() => saveFeesMutation.mutate()} disabled={saveFeesMutation.isPending}>
          {saveFeesMutation.isPending ? "Saving…" : "Save fee settings"}
        </Button>
      </CardFooter>
    </Card>
  )
}

const STEP_DND_ACTIVATION = { activationConstraint: { distance: 8 } }
const QUESTION_DND_ACTIVATION = { activationConstraint: { distance: 8 } }

function SortableStepShell({
  id,
  orderBadge,
  children,
}: {
  id: string
  orderBadge: number
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-6 flex h-9 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md border border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/50 active:cursor-grabbing"
          aria-label="Drag to reorder step"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
        <Badge variant="secondary" className="mt-6 shrink-0 font-mono text-xs">
          {orderBadge}
        </Badge>
      </div>
    </div>
  )
}

function SortableQuestionShell({
  id,
  orderBadge,
  children,
}: {
  id: string
  orderBadge: number
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-2">
      <button
        type="button"
        className="flex w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md border border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40 active:cursor-grabbing"
        aria-label="Drag to reorder question"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
      <Badge variant="outline" className="shrink-0 self-center font-mono text-[10px]">
        {orderBadge}
      </Badge>
    </div>
  )
}

type FormBuilderHandlers = {
  moveStep: (stepId: string, delta: number) => void
  moveQuestion: (stepId: string, questionId: string, delta: number) => void
  onQuestionsDragEnd: (stepId: string) => (event: DragEndEvent) => void
  openEditStep: (step: RegistrationStep) => void
  handleDeleteStep: (id: string) => void
  openAddQuestion: (stepId: string) => void
  openEditQuestion: (stepId: string, question: RegistrationQuestion) => void
  handleDeleteQuestion: (id: string) => void
}

function StepQuestionsBlock({
  step,
  stepIndex,
  sortedStepsLength,
  stepQuestions,
  handlers,
}: {
  step: RegistrationStep
  stepIndex: number
  sortedStepsLength: number
  stepQuestions: RegistrationQuestion[]
  handlers: FormBuilderHandlers
}) {
  const questionSensors = useSensors(
    useSensor(PointerSensor, QUESTION_DND_ACTIVATION),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  return (
    <Card>
      <CardHeader className="bg-muted/30">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">{step.title}</CardTitle>
            {step.description ? <CardDescription>{step.description}</CardDescription> : null}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Move step up"
              disabled={stepIndex === 0}
              onClick={() => handlers.moveStep(step.id, -1)}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Move step down"
              disabled={stepIndex === sortedStepsLength - 1}
              onClick={() => handlers.moveStep(step.id, 1)}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlers.openEditStep(step)}>
              <Edit className="mr-1 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => void handlers.handleDeleteStep(step.id)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-6">
        <DndContext
          id={`questions-${step.id}`}
          sensors={questionSensors}
          collisionDetection={closestCenter}
          onDragEnd={handlers.onQuestionsDragEnd(step.id)}
        >
          <SortableContext
            items={stepQuestions.map((q) => q.id)}
            strategy={verticalListSortingStrategy}
          >
            {stepQuestions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No questions yet.</p>
            ) : (
              stepQuestions.map((q, qi) => (
                <SortableQuestionShell key={q.id} id={q.id} orderBadge={qi + 1}>
                  <div className="group mb-2 flex items-center justify-between rounded-md border border-border/60 bg-background p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {q.label} {q.required && <span className="text-destructive">*</span>}
                      </p>
                      <p className="text-xs uppercase text-muted-foreground">
                        {q.type.replace("_", " ")}
                        {q.type === "council_preference" && q.councilPreferenceCount
                          ? ` · ${q.councilPreferenceCount} prefs`
                          : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Move question up"
                        disabled={qi === 0}
                        onClick={() => handlers.moveQuestion(step.id, q.id, -1)}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Move question down"
                        disabled={qi === stepQuestions.length - 1}
                        onClick={() => handlers.moveQuestion(step.id, q.id, 1)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-primary opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handlers.openEditQuestion(step.id, q)}
                        aria-label="Edit question"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => void handlers.handleDeleteQuestion(q.id)}
                        aria-label="Delete question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </SortableQuestionShell>
              ))
            )}
          </SortableContext>
        </DndContext>
        <Button
          variant="secondary"
          className="mt-2 w-full border border-dashed"
          onClick={() => handlers.openAddQuestion(step.id)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add question
        </Button>
      </CardContent>
    </Card>
  )
}

function FormBuilderTab() {
  const queryClient = useQueryClient()
  const [isStepModalOpen, setIsStepModalOpen] = useState(false)
  const [editingStep, setEditingStep] = useState<RegistrationStep | null>(null)
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<RegistrationQuestion | null>(null)
  const [activeStepId, setActiveStepId] = useState<string>("")

  const stepSensors = useSensors(
    useSensor(PointerSensor, STEP_DND_ACTIVATION),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const { data: steps = [], isLoading: loadingSteps } = useQuery({
    queryKey: REG_STEPS_QUERY_KEY,
    queryFn: () => adminRegistrationService.listSteps(),
  })
  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: REG_QUESTIONS_QUERY_KEY,
    queryFn: () => adminRegistrationService.listQuestions(),
  })

  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => a.order - b.order),
    [steps]
  )

  const createStepMutation = useMutation({
    mutationFn: (data: Omit<RegistrationStep, "id">) => adminRegistrationService.createStep(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: REG_STEPS_QUERY_KEY }),
  })
  const updateStepMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RegistrationStep> }) =>
      adminRegistrationService.updateStep(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: REG_STEPS_QUERY_KEY }),
  })
  const deleteStepMutation = useMutation({
    mutationFn: (id: string) => adminRegistrationService.deleteStep(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REG_STEPS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: REG_QUESTIONS_QUERY_KEY })
    },
  })

  const createQuestionMutation = useMutation({
    mutationFn: (data: Omit<RegistrationQuestion, "id">) =>
      adminRegistrationService.createQuestion(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: REG_QUESTIONS_QUERY_KEY }),
  })
  const updateQuestionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RegistrationQuestion> }) =>
      adminRegistrationService.updateQuestion(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: REG_QUESTIONS_QUERY_KEY }),
  })
  const deleteQuestionMutation = useMutation({
    mutationFn: (id: string) => adminRegistrationService.deleteQuestion(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: REG_QUESTIONS_QUERY_KEY }),
  })

  const questionsByStep = useMemo(() => {
    const acc: Record<string, RegistrationQuestion[]> = {}
    for (const q of questions) {
      if (!acc[q.stepId]) acc[q.stepId] = []
      acc[q.stepId].push(q)
    }
    for (const k of Object.keys(acc)) {
      acc[k].sort((a, b) => a.displayOrder - b.displayOrder)
    }
    return acc
  }, [questions])

  const hideCouncilPreferenceType = useMemo(
    () =>
      questions.some(
        (q) => q.type === "council_preference" && q.id !== editingQuestion?.id
      ),
    [questions, editingQuestion?.id]
  )

  const persistStepOrders = async (ordered: RegistrationStep[]) => {
    const next = ordered.map((s, index) => ({ ...s, order: index }))
    await queryClient.cancelQueries({ queryKey: REG_STEPS_QUERY_KEY })
    const snapshot = cloneSteps(queryClient.getQueryData<RegistrationStep[]>(REG_STEPS_QUERY_KEY))
    queryClient.setQueryData<RegistrationStep[]>(REG_STEPS_QUERY_KEY, next)
    try {
      await Promise.all(
        next.map((s) => adminRegistrationService.updateStep(s.id, { order: s.order }))
      )
    } catch {
      if (snapshot) {
        queryClient.setQueryData(REG_STEPS_QUERY_KEY, snapshot)
      } else {
        await queryClient.invalidateQueries({ queryKey: REG_STEPS_QUERY_KEY })
      }
      toast.error("Could not save step order. Changes were reverted.")
    }
  }

  const onStepsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sortedSteps.findIndex((s) => s.id === active.id)
    const newIndex = sortedSteps.findIndex((s) => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(sortedSteps, oldIndex, newIndex)
    void persistStepOrders(reordered)
  }

  const moveStep = (stepId: string, delta: number) => {
    const idx = sortedSteps.findIndex((s) => s.id === stepId)
    const j = idx + delta
    if (idx < 0 || j < 0 || j >= sortedSteps.length) return
    const reordered = arrayMove(sortedSteps, idx, j)
    void persistStepOrders(reordered)
  }

  const persistQuestionOrders = async (stepId: string, ordered: RegistrationQuestion[]) => {
    const nextForStep = ordered.map((q, index) => ({ ...q, displayOrder: index }))
    await queryClient.cancelQueries({ queryKey: REG_QUESTIONS_QUERY_KEY })
    const snapshot = cloneQuestions(
      queryClient.getQueryData<RegistrationQuestion[]>(REG_QUESTIONS_QUERY_KEY)
    )
    queryClient.setQueryData<RegistrationQuestion[]>(REG_QUESTIONS_QUERY_KEY, (old) => {
      if (!old) return old
      const rest = old.filter((q) => q.stepId !== stepId)
      return [...rest, ...nextForStep]
    })
    try {
      await Promise.all(
        nextForStep.map((q) =>
          adminRegistrationService.updateQuestion(q.id, { displayOrder: q.displayOrder })
        )
      )
    } catch {
      if (snapshot) {
        queryClient.setQueryData(REG_QUESTIONS_QUERY_KEY, snapshot)
      } else {
        await queryClient.invalidateQueries({ queryKey: REG_QUESTIONS_QUERY_KEY })
      }
      toast.error("Could not save question order. Changes were reverted.")
    }
  }

  const onQuestionsDragEnd = (stepId: string) => (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const list = [...(questionsByStep[stepId] || [])]
    const oldIndex = list.findIndex((q) => q.id === active.id)
    const newIndex = list.findIndex((q) => q.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(list, oldIndex, newIndex)
    void persistQuestionOrders(stepId, reordered)
  }

  const moveQuestion = (stepId: string, questionId: string, delta: number) => {
    const list = [...(questionsByStep[stepId] || [])]
    const idx = list.findIndex((q) => q.id === questionId)
    const j = idx + delta
    if (idx < 0 || j < 0 || j >= list.length) return
    const reordered = arrayMove(list, idx, j)
    void persistQuestionOrders(stepId, reordered)
  }

  const openAddStep = () => {
    setEditingStep(null)
    setIsStepModalOpen(true)
  }
  const openEditStep = (step: RegistrationStep) => {
    setEditingStep(step)
    setIsStepModalOpen(true)
  }

  const handleSaveStep = async (data: { title: string; description?: string }) => {
    if (editingStep) {
      await updateStepMutation.mutateAsync({
        id: editingStep.id,
        data: {
          title: data.title,
          description: data.description ?? null,
        },
      })
    } else {
      const maxOrder = sortedSteps.reduce((m, s) => Math.max(m, s.order), -1)
      await createStepMutation.mutateAsync({
        title: data.title,
        description: data.description ?? null,
        order: maxOrder + 1,
      })
    }
  }

  const handleDeleteStep = async (id: string) => {
    if (confirm("Are you sure? This deletes the step and ALL its questions!")) {
      await deleteStepMutation.mutateAsync(id)
    }
  }

  const openAddQuestion = (stepId: string) => {
    setActiveStepId(stepId)
    setEditingQuestion(null)
    setIsQuestionModalOpen(true)
  }
  const openEditQuestion = (stepId: string, question: RegistrationQuestion) => {
    setActiveStepId(stepId)
    setEditingQuestion(question)
    setIsQuestionModalOpen(true)
  }

  const nextDisplayOrderForStep = (stepId: string) => {
    const list = questionsByStep[stepId] || []
    if (list.length === 0) return 0
    return Math.max(...list.map((q) => q.displayOrder)) + 1
  }

  const handleSaveQuestion = async (data: QuestionFormData) => {
    const options =
      data.type === "choices" || data.type === "dropdown"
        ? data.options?.trim() || null
        : null
    const councilPreferenceCount =
      data.type === "council_preference" ? (data.councilPreferenceCount ?? 1) : undefined

    if (editingQuestion) {
      await updateQuestionMutation.mutateAsync({
        id: editingQuestion.id,
        data: {
          label: data.label,
          type: data.type,
          options,
          required: data.required,
          councilPreferenceCount,
        },
      })
    } else {
      await createQuestionMutation.mutateAsync({
        stepId: activeStepId,
        label: data.label,
        type: data.type,
        options,
        required: data.required,
        displayOrder: nextDisplayOrderForStep(activeStepId),
        councilPreferenceCount:
          data.type === "council_preference" ? (data.councilPreferenceCount ?? 1) : 1,
      })
    }
  }

  const handleDeleteQuestion = async (id: string) => {
    if (confirm("Delete this question?")) {
      await deleteQuestionMutation.mutateAsync(id)
    }
  }

  if (loadingSteps || loadingQuestions) {
    return <div className="text-sm text-muted-foreground">Loading form configuration…</div>
  }

  return (
    <div className="space-y-6">
      <DndContext sensors={stepSensors} collisionDetection={closestCenter} onDragEnd={onStepsDragEnd}>
        <SortableContext items={sortedSteps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {sortedSteps.map((step, stepIndex) => {
            const stepQuestions = questionsByStep[step.id] || []
            const handlers: FormBuilderHandlers = {
              moveStep,
              moveQuestion,
              onQuestionsDragEnd,
              openEditStep,
              handleDeleteStep,
              openAddQuestion,
              openEditQuestion,
              handleDeleteQuestion,
            }
            return (
              <SortableStepShell key={step.id} id={step.id} orderBadge={stepIndex + 1}>
                <StepQuestionsBlock
                  step={step}
                  stepIndex={stepIndex}
                  sortedStepsLength={sortedSteps.length}
                  stepQuestions={stepQuestions}
                  handlers={handlers}
                />
              </SortableStepShell>
            )
          })}
        </SortableContext>
      </DndContext>

      <Button className="w-full" onClick={openAddStep}>
        <Plus className="mr-2 h-4 w-4" />
        Add new step
      </Button>

      <StepModal
        isOpen={isStepModalOpen}
        onClose={() => setIsStepModalOpen(false)}
        onSave={handleSaveStep}
        step={editingStep}
      />

      <QuestionModal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        onSave={handleSaveQuestion}
        question={editingQuestion}
        stepId={activeStepId}
        hideCouncilPreferenceType={hideCouncilPreferenceType}
      />
    </div>
  )
}
