import React, { useState, useMemo } from "react"
import { useForm, Controller } from "react-hook-form"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { authService } from "../../services/auth"
import { publicRegistrationService } from "../../services/publicRegistration"
import { RegisterUser } from "@trackmun/shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface RegisterFormProps {
  onSuccess?: () => void
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [paymentFile, setPaymentFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Fetch form structure from backend
  const { data: settings } = useQuery({
    queryKey: ["public-registration-settings"],
    queryFn: publicRegistrationService.getSettings,
  })
  const { data: steps, isLoading: isLoadingSteps } = useQuery({
    queryKey: ["public-registration-steps"],
    queryFn: publicRegistrationService.listSteps,
  })
  const { data: questions, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ["public-registration-questions"],
    queryFn: publicRegistrationService.listQuestions,
  })
  const { data: fullCouncils, isLoading: isLoadingCouncils } = useQuery({
    queryKey: ["public-registration-full-councils"],
    queryFn: publicRegistrationService.getFullCouncils,
  })

  const formMethods = useForm<RegisterUser>({
    defaultValues: { answers: {} },
    mode: "onChange"
  })

  const { register, handleSubmit, control, watch, trigger, formState: { errors } } = formMethods
  const currentAnswers = watch("answers") || {}

  const mutation = useMutation({
    mutationFn: (data: RegisterUser) => authService.register(data),
    onSuccess: () => {
      toast.success("Registration submitted! You will receive login credentials via email if approved.")
      onSuccess?.()
      navigate("/register/success")
    },
    onError: (error: any) => {
      toast.error(error.message || "Registration failed")
    },
  })

  // Group questions by step
  const questionsByStep = useMemo(() => {
    if (!questions) return {}
    return questions.reduce((acc: any, q) => {
      if (!acc[q.stepId]) acc[q.stepId] = []
      acc[q.stepId].push(q)
      return acc
    }, {})
  }, [questions])

  // Form structure: Step 0 is 'Account Details', the rest are dynamic steps
  const sortedDynamicSteps = (steps || []).sort((a, b) => a.order - b.order)
  const requirePaymentProof = settings?.payment_proof_timing === 'registration'
  const totalSteps = 1 + sortedDynamicSteps.length + (requirePaymentProof ? 1 : 0)

  const isPaymentStep = requirePaymentProof && currentStep === totalSteps - 1

  const handleNext = async () => {
    // Validate current step
    let isValid = false
    if (currentStep === 0) {
      isValid = await trigger(["firstName", "lastName", "email"])
    } else {
      const stepId = sortedDynamicSteps[currentStep - 1].id
      const stepQuestions = questionsByStep[stepId] || []
      
      isValid = true
      // Manual required validation per question in this step
      for (const q of stepQuestions) {
        if (q.required && !currentAnswers[q.id]) {
          toast.error(`"${q.label}" is required.`)
          isValid = false
          break
        }
      }
    }

    if (isValid) {
      setCurrentStep((p) => p + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep((p) => Math.max(0, p - 1))
  }

  const onSubmit = async (data: RegisterUser) => {
    if (requirePaymentProof && !paymentFile) {
      toast.error("Please select a payment proof document.")
      return
    }

    try {
      if (requirePaymentProof && paymentFile) {
        setIsUploading(true)
        const { uploadUrl, key } = await publicRegistrationService.getPaymentProofUrl({
          filename: paymentFile.name,
          contentType: paymentFile.type,
          size: paymentFile.size,
        })
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: paymentFile,
          headers: { "Content-Type": paymentFile.type },
        })
        if (!uploadRes.ok) throw new Error("Failed to upload file")
        data.paymentProofR2Key = key
        setIsUploading(false)
      }
      mutation.mutate(data)
    } catch (err: any) {
      setIsUploading(false)
      toast.error(err.message || "Failed to submit registration")
    }
  }

  // Generate dynamic options, especially filtering used council choices
  const getCouncilOptions = (questionId: string, optionsStr: string | null | undefined) => {
    const rawOptions = optionsStr ? optionsStr.split(',').map(s => s.trim()).filter(Boolean) : []
    const usedChoices = Object.entries(currentAnswers)
      .filter(([k, v]) => k !== questionId && !!v)
      .map(([_, v]) => v)

    return rawOptions.map(opt => ({
      value: opt,
      disabled: usedChoices.includes(opt) || (fullCouncils || []).includes(opt),
      isFull: (fullCouncils || []).includes(opt)
    }))
  }

  if (isLoadingSteps || isLoadingQuestions || isLoadingCouncils) {
    return (
      <Card className="border-border/80 shadow-lg text-center p-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">Loading registration steps...</p>
      </Card>
    )
  }

  return (
    <Card className="border-border/80 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-muted">
        <div 
           className="h-full bg-primary transition-all duration-300"
           style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>
      
      <CardHeader className="space-y-1 pb-4 pt-8">
        <CardTitle className="text-xl font-semibold">
          {currentStep === 0 ? "Account Details" : isPaymentStep ? "Payment Proof" : sortedDynamicSteps[currentStep - 1]?.title}
        </CardTitle>
        <CardDescription>
          Step {currentStep + 1} of {totalSteps}. {currentStep > 0 && !isPaymentStep && sortedDynamicSteps[currentStep - 1]?.description}
          {isPaymentStep && "Upload your payment receipt to complete registration."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={(e) => { e.preventDefault() }} className="space-y-5" noValidate>
          {mutation.error && (
            <Alert variant="destructive" aria-live="assertive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Could not submit registration</AlertTitle>
              <AlertDescription>
                {(mutation.error as any)?.message || "Registration failed. Please try again."}
              </AlertDescription>
            </Alert>
          )}

          {currentStep === 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  {...register("firstName")}
                  className="h-11"
                />
                {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  {...register("lastName")}
                  className="h-11"
                />
                {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register("email")}
                  className="h-11"
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
            </div>
          )}

          {/* Dynamic Registration Steps */}
          {currentStep > 0 && !isPaymentStep && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               {questionsByStep[sortedDynamicSteps[currentStep - 1]?.id]?.sort((a:any, b:any) => a.displayOrder - b.displayOrder).map((q: any) => (
                 <div key={q.id} className="space-y-2">
                   <Label htmlFor={q.id} className="text-base font-medium">
                     {q.label} {q.required && <span className="text-destructive">*</span>}
                   </Label>
                   
                   {/* TEXT */}
                   {q.type === 'text' && (
                     <Input id={q.id} className="h-11" {...register(`answers.${q.id}`)} />
                   )}
                   
                   {/* LONG TEXT */}
                   {q.type === 'long_text' && (
                     <textarea 
                       id={q.id}
                       className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                       {...register(`answers.${q.id}`)}
                     />
                   )}

                   {/* DROPDOWN */}
                   {q.type === 'dropdown' && (
                     <Controller
                       control={control}
                       name={`answers.${q.id}`}
                       render={({ field }) => {
                         const rawOptions = q.options ? q.options.split(',').map((s:string) => s.trim()).filter(Boolean) : []
                         return (
                           <Select onValueChange={field.onChange} value={field.value || ""}>
                             <SelectTrigger className="h-11 shadow-none">
                               <SelectValue placeholder="Select an option" />
                             </SelectTrigger>
                             <SelectContent>
                               {rawOptions.map((opt: string) => (
                                 <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                         )
                       }}
                     />
                   )}

                   {/* COUNCIL PREFERENCE */}
                   {q.type === 'council_preference' && (
                     <Controller
                       control={control}
                       name={`answers.${q.id}`}
                       render={({ field }) => {
                         const options = getCouncilOptions(q.id, q.options)
                         return (
                           <Select onValueChange={field.onChange} value={field.value || ""}>
                             <SelectTrigger className="h-11 shadow-none">
                               <SelectValue placeholder="Select a council" />
                             </SelectTrigger>
                             <SelectContent>
                               {options.map((opt: any) => (
                                 <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                                   {opt.value} {opt.isFull ? '(At Capacity)' : opt.disabled ? '(Already Selected)' : ''}
                                 </SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                         )
                       }}
                     />
                   )}

                   {/* CHOICES (RADIO) */}
                   {q.type === 'choices' && (
                     <Controller
                       control={control}
                       name={`answers.${q.id}`}
                       render={({ field }) => {
                         const rawOptions = q.options ? q.options.split(',').map((s:string) => s.trim()).filter(Boolean) : []
                         return (
                           <div className="flex flex-col gap-3 mt-2">
                             {rawOptions.map((opt: string) => (
                               <label key={opt} className="flex items-center gap-2 cursor-pointer border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                                 <input 
                                   type="radio" 
                                   value={opt} 
                                   checked={field.value === opt}
                                   onChange={() => field.onChange(opt)}
                                   className="h-4 w-4 text-primary focus:ring-primary border-muted focus:ring-offset-background"
                                 />
                                 <span className="text-sm">{opt}</span>
                               </label>
                             ))}
                           </div>
                         )
                       }}
                     />
                   )}
                 </div>
               ))}
            </div>
          )}
          {/* Payment Proof Step */}
          {isPaymentStep && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label htmlFor="paymentProof">Upload Receipt (Image or PDF) <span className="text-destructive">*</span></Label>
                <Input
                  id="paymentProof"
                  type="file"
                  accept="image/jpeg, image/png, image/webp, application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setPaymentFile(e.target.files[0])
                    }
                  }}
                  className="h-11 cursor-pointer file:cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                <p className="text-xs text-muted-foreground mt-2">Maximum file size: 10MB.</p>
              </div>
            </div>
          )}
        </form>
      </CardContent>

      <CardFooter className="bg-muted/30 border-t pt-4 flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleBack} 
          disabled={currentStep === 0 || mutation.isPending || isUploading}
        >
          <ArrowLeft className="h-4 w-4 mr-2"/> Back
        </Button>

        {currentStep < totalSteps - 1 ? (
          <Button type="button" onClick={handleNext}>
            Next <ArrowRight className="h-4 w-4 ml-2"/>
          </Button>
        ) : (
          <Button 
            type="button" 
            onClick={handleSubmit(onSubmit)} 
            disabled={mutation.isPending || isUploading || (requirePaymentProof && !paymentFile)}
            className="px-8"
          >
            {(mutation.isPending || isUploading) ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Submitting...</> : "Submit Registration"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
