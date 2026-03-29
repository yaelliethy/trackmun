import React from "react"
import { Link } from "react-router-dom"
import { RegisterForm } from "@/components/auth/RegisterForm"
import { ModeToggle } from "@/components/mode-toggle"
import brand from "@/config/brand"
import { motion } from "framer-motion"
import { CheckCircle, Mail, UserPlus } from "lucide-react"

const STEPS = [
  {
    icon: UserPlus,
    label: "Submit your details",
    description: "Fill in your name, email, and committee preferences.",
  },
  {
    icon: Mail,
    label: "Wait for approval",
    description: "Our team will review your request within 24–48 hours.",
  },
  {
    icon: CheckCircle,
    label: "Get your credentials",
    description: "Once approved, receive your login details via email.",
  },
]

export const RegisterPage: React.FC = () => {
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
          <div className="relative z-10 max-w-sm space-y-8">
            <div className="space-y-1">
              <p className="text-xs tracking-caps text-primary-foreground/50">
                Delegate Registration
              </p>
              <h2 className="text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
                Request to join
                <br />as a delegate.
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-primary-foreground/70">
              Submit your registration request. If approved, you'll receive
              login credentials via email to access your delegate profile and
              conference features.
            </p>

            {/* How it works */}
            <ul className="space-y-5">
              {STEPS.map((step, i) => (
                <li key={i} className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground">
                    <step.icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-primary-foreground">
                      {step.label}
                    </span>
                    <span className="block text-xs leading-relaxed text-primary-foreground/60 mt-0.5">
                      {step.description}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative z-10 text-[11px] text-primary-foreground/40">
            Registration requires admin approval before access is granted.
          </p>
        </motion.div>

        {/* ── Right: Form panel ── */}
        <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-12 xl:px-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="mx-auto w-full max-w-md space-y-8"
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
                <p className="text-xs text-muted-foreground">Delegate registration</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Join as a delegate
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Fill in your details and committee choices. If approved, you'll
                receive login credentials via email.
              </p>
            </div>

            <RegisterForm />

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-primary hover:underline underline-offset-4"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
