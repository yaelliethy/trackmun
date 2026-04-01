import React from "react"
import { useAuthStore } from "../../hooks/useAuthStore"
import { Button } from "@/components/ui/button"
import { UserX } from "lucide-react"

export const ImpersonationBanner: React.FC = () => {
  const { isImpersonating, impersonatedUser, stopImpersonation } =
    useAuthStore()

  if (!isImpersonating || !impersonatedUser) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 border-b border-warning/35 bg-warning/10 px-4 py-3 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-start gap-3 text-sm text-warning-foreground">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/20">
            <UserX className="h-4 w-4" aria-hidden />
          </span>
          <p className="pt-0.5 leading-relaxed">
            <span className="font-semibold text-warning-foreground">
              Impersonation active.
            </span>{" "}
            You are viewing the console as{" "}
            <span className="font-medium">{impersonatedUser.name}</span>{" "}
            <span className="capitalize">({impersonatedUser.role})</span>.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={stopImpersonation}
          className="shrink-0 border-warning/40 bg-background/80 font-semibold text-warning-foreground hover:bg-warning/15 hover:text-warning-foreground"
        >
          Stop impersonation
        </Button>
      </div>
    </div>
  )
}
