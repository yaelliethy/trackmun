import React from "react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { Home, AlertCircle } from "lucide-react"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ModeToggle } from "@/components/mode-toggle"

interface ErrorPageProps {
  code?: string
  title?: string
  message?: string
  showHomeButton?: boolean
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  code = "404",
  title = "Page not found",
  message = "The page you're looking for doesn't exist or has been moved.",
  showHomeButton = true,
}) => {
  const navigate = useNavigate()

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center bg-muted/30 px-4 py-16">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-lg border-border/80 shadow-lg">
        <CardHeader className="space-y-4 text-center sm:text-left">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive sm:mx-0">
            <AlertCircle className="h-7 w-7" aria-hidden />
          </div>
          <div className="space-y-2">
            <p className="text-5xl font-bold tracking-tight text-primary sm:text-6xl">
              {code}
            </p>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {title}
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {message}
            </CardDescription>
          </div>
        </CardHeader>
        {showHomeButton ? (
          <CardFooter className="flex justify-center border-t border-border/60 bg-muted/20 pt-6 sm:justify-start">
            <Button
              variant="default"
              className="min-w-[10rem]"
              onClick={() => navigate("/")}
            >
              <Home className="mr-2 h-4 w-4" />
              Back to home
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  )
}

export const NotFoundPage = () => <ErrorPage />

export const ForbiddenPage = () => (
  <ErrorPage
    code="403"
    title="Access denied"
    message="You don't have permission to access this resource. Please contact an administrator if you believe this is an error."
  />
)
