import React from "react"
import { Button } from "@/components/ui/button"
import { useNavigate, Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import brand from "@/config/brand"
import { motion } from "framer-motion"

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
    <div className="relative flex min-h-screen flex-col bg-background">
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 sm:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <img
            src={brand.logoPath}
            alt=""
            className="h-6 w-6 rounded object-contain"
          />
          <span className="font-medium">{brand.appName}</span>
        </Link>
        <ModeToggle />
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-md space-y-8 text-left"
        >
          {/* Error code */}
          <div className="space-y-2">
            <p className="font-mono text-[11px] tracking-caps text-muted-foreground">
              Error {code}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {title}
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              {message}
            </p>
          </div>

          {/* Divider */}
          <div className="h-px w-16 bg-border" />

          {/* Action */}
          {showHomeButton && (
            <div className="flex items-center gap-3">
              <Button
                variant="default"
                onClick={() => navigate("/")}
                className="h-10 gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Go home
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="h-10 text-muted-foreground hover:text-foreground"
              >
                Go back
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export const NotFoundPage = () => <ErrorPage />

export const ForbiddenPage = () => (
  <ErrorPage
    code="403"
    title="Access denied"
    message="You don't have permission to access this resource. Contact an administrator if you believe this is an error."
  />
)
