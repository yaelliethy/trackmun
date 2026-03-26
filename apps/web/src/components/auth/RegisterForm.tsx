import React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { authService } from "../../services/auth"
import { RegisterUser, RegisterUserSchema } from "@trackmun/shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { AlertCircle } from "lucide-react"
import { toast } from "sonner"

const COMMITTEE_CHOICES = [
  { value: "general-assembly", label: "General Assembly" },
  { value: "security-council", label: "Security Council" },
  { value: "economic-social", label: "ECOSOC" },
  { value: "historical-crisis", label: "Historical Crisis Committee" },
  { value: "specialized-agency", label: "Specialized Agency" },
  { value: "regional-body", label: "Regional Body" },
  { value: "crisis-committee", label: "Crisis Committee" },
  { value: "press-corps", label: "Press Corps" },
]

interface RegisterFormProps {
  onSuccess?: () => void
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RegisterUser>({
    resolver: zodResolver(RegisterUserSchema),
  })

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

  const onSubmit = (data: RegisterUser) => {
    mutation.mutate(data)
  }

  return (
    <Card className="border-border/80 shadow-lg">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl font-semibold">
          Request to join as a delegate
        </CardTitle>
        <CardDescription>
          Fill in your details and committee choices. If approved, you'll receive login credentials via email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {mutation.error && (
            <Alert variant="destructive" aria-live="assertive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Could not submit registration</AlertTitle>
              <AlertDescription>
                {(mutation.error as any)?.message || "Registration failed. Please try again."}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              type="text"
              placeholder="John"
              {...register("firstName")}
              className="h-11"
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Doe"
              {...register("lastName")}
              className="h-11"
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register("email")}
              className="h-11"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="firstChoice">First Choice Committee</Label>
            <Select
              onValueChange={(value) => setValue("firstChoice", value)}
              defaultValue={watch("firstChoice")}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Select your first choice" />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                {COMMITTEE_CHOICES.map((choice) => (
                  <SelectItem key={choice.value} value={choice.value}>
                    {choice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.firstChoice && (
              <p className="text-sm text-destructive">{errors.firstChoice.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondChoice">Second Choice Committee</Label>
            <Select
              onValueChange={(value) => setValue("secondChoice", value)}
              defaultValue={watch("secondChoice")}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Select your second choice" />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                {COMMITTEE_CHOICES.map((choice) => (
                  <SelectItem key={choice.value} value={choice.value}>
                    {choice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.secondChoice && (
              <p className="text-sm text-destructive">{errors.secondChoice.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="h-11 w-full text-base font-semibold"
            isLoading={mutation.isPending}
          >
            Submit Registration Request
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Your registration will be reviewed by our team. If approved, you'll receive an email with your login credentials.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
