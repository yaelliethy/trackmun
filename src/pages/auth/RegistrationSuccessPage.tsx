import React from "react"
import { Link } from "react-router-dom"
import { ModeToggle } from "@/components/mode-toggle"
import brand from "@/config/brand"
import { motion } from "framer-motion"
import { CheckCircle, Mail, Clock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const NEXT_STEPS = [
  {
    number: "01",
    label: "Verify your email",
    description:
      "Check your inbox for a verification link and click it to confirm your email address.",
  },
  {
    number: "02",
    label: "Wait for admin approval",
    description:
      "Our team will review your registration and committee choices within 24–48 hours.",
  },
  {
    number: "03",
    label: "Get started",
    description:
      "Once approved, you'll receive full access to your profile, QR code, and conference features.",
  },
]

export const RegistrationSuccessPage: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute right-4 top-4 z-50 sm:right-6 sm:top-6">
        <ModeToggle />
      </div>

      <div className="grid min-h-screen lg:grid-cols-[1fr_1.2fr]">
        {/* ── Left: Brand panel ── */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:p-14"
        >
          <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-60" aria-hidden />
          <div className="auth-panel-line absolute left-[18%] inset-y-0 h-full" aria-hidden />
          <div className="auth-panel-line absolute right-[22%] inset-y-0 h-full opacity-40" aria-hidden />

          {/* Wordmark */}
          <div className="relative z-10 flex items-center gap-3">
            <img
              src={brand.logoPath}
              alt=""
              className="h-9 w-9 rounded-md bg-primary-foreground/10 p-1.5 object-contain"
            />
            <div>
              <p className="text-base font-semibold tracking-tight">{brand.appName}</p>
              <p className="text-xs text-primary-foreground/60 tracking-wide">
                Conference operations, refined.
              </p>
            </div>
          </div>

          {/* Main copy */}
          <div className="relative z-10 max-w-sm space-y-6">
            <div className="space-y-1">
              <p className="text-xs tracking-caps text-primary-foreground/50">
                Registration Status
              </p>
              <h2 className="text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
                You're almost there!
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-primary-foreground/70">
              Your registration has been submitted successfully. We're excited to
              have you join our conference.
            </p>
            <ul className="space-y-4">
              {[
                { icon: Mail, label: "Check your email for a verification link." },
                { icon: Clock, label: "An admin will review your account within 24–48 hours." },
              ].map(({ icon: Icon, label }, i) => (
                <li key={i} className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border border-primary-foreground/20 bg-primary-foreground/10">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="text-sm text-primary-foreground/75">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative z-10 text-[11px] text-primary-foreground/40">
            Questions? Contact your conference administrator for assistance.
          </p>
        </motion.div>

        {/* ── Right: Content panel ── */}
        <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-12 xl:px-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="mx-auto w-full max-w-md space-y-10"
          >
            {/* Mobile wordmark */}
            <div className="flex items-center gap-3 lg:hidden">
              <img
                src={brand.logoPath}
                alt=""
                className="h-9 w-9 rounded-md border border-border object-contain p-1.5"
              />
              <div>
                <p className="text-sm font-semibold">{brand.appName}</p>
                <p className="text-xs text-muted-foreground">Registration submitted</p>
              </div>
            </div>

            {/* Success indicator */}
            <div className="space-y-4">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-success/30 bg-success/10"
              >
                <CheckCircle className="h-7 w-7 text-success" aria-hidden />
              </motion.div>
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Request submitted!
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Thank you for registering. Your account is pending admin approval.
                </p>
              </div>
            </div>

            {/* Next steps */}
            <div className="space-y-4">
              <p className="text-xs tracking-caps text-muted-foreground">What happens next</p>
              <div className="space-y-0 divide-y divide-border/60">
                {NEXT_STEPS.map((step) => (
                  <div key={step.number} className="flex items-start gap-4 py-4">
                    <span className="font-mono text-xs font-medium text-muted-foreground/60 pt-0.5 tabular-nums w-6 shrink-0">
                      {step.number}
                    </span>
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-medium text-foreground">{step.label}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button variant="outline" className="w-full h-11" asChild>
              <Link to="/login">
                Go to login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Check your spam folder if you don't receive the verification email.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
