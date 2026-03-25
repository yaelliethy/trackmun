import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  council: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface UserCreateModalProps {
  isOpen: boolean
  role: "oc" | "chair" | "admin"
  onClose: () => void
  onSave: (data: FormData & { role: "oc" | "chair" | "admin" }) => Promise<void>
}

export const UserCreateModal: React.FC<UserCreateModalProps> = ({
  isOpen,
  role,
  onClose,
  onSave,
}) => {
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      council: "",
    },
  })

  // Whenever modal opens/closes, reset form
  React.useEffect(() => {
    if (isOpen) {
      reset()
    }
  }, [isOpen, reset])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await onSave({
        ...data,
        role,
        council: data.council?.trim() === "" ? undefined : data.council,
      })
      onClose()
    } catch (err) {
      console.error("Failed to create user:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-6 py-6 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Create {role.toUpperCase()}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Create a new account for this member. They can log in using their email and the password you provide.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6 px-6 py-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="create-name">Full name</Label>
                <Input
                  id="create-name"
                  placeholder="Full name"
                  className="h-10"
                  {...register("name")}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="user@example.com"
                  className="h-10"
                  {...register("email")}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-password">Password</Label>
                <Input
                  id="create-password"
                  type="password"
                  placeholder="Secret password"
                  className="h-10"
                  {...register("password")}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-council">Council (Optional)</Label>
                <Input
                  id="create-council"
                  placeholder="e.g. UNSC, DISEC"
                  className="h-10"
                  {...register("council")}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank if this user is not assigned to a specific committee.
                </p>
                {errors.council && <p className="text-xs text-destructive">{errors.council.message}</p>}
              </div>
            </div>
          </div>
          <Separator />
          <DialogFooter className="flex flex-col-reverse gap-2 border-t border-border/60 bg-muted/10 px-6 py-4 sm:flex-row sm:justify-end sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={loading}
              className="w-full sm:w-auto"
            >
              Create user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
