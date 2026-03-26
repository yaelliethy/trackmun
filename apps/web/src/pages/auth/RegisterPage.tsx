import React from "react"
import { Link } from "react-router-dom"
import { RegisterForm } from "@/components/auth/RegisterForm"
import { ModeToggle } from "@/components/mode-toggle"
import brand from "@/config/brand"
import { motion } from "framer-motion"
import { CheckCircle, Mail, UserPlus } from "lucide-react"

export const RegisterPage: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute right-4 top-4 z-50 sm:right-6 sm:top-6">
        <ModeToggle />
      </div>
      <div className="grid min-h-screen lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:p-14"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            aria-hidden
          >
            <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary-foreground/10 blur-3xl" />
            <div className="absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-primary-foreground/5 blur-3xl" />
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <img
              src={brand.logoPath}
              alt=""
              className="h-11 w-11 rounded-xl bg-primary-foreground/10 p-2"
            />
            <div>
              <p className="text-lg font-semibold tracking-tight">
                {brand.appName}
              </p>
              <p className="text-sm text-primary-foreground/80">
                Conference operations, refined.
              </p>
            </div>
          </div>
          <div className="relative z-10 max-w-md space-y-8">
            <h2 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Request to join as a delegate
            </h2>
            <p className="text-base leading-relaxed text-primary-foreground/85">
              Submit your registration request. If approved, you'll receive login
              credentials via email to access your delegate profile and conference
              features.
            </p>
            <ul className="space-y-4 text-sm text-primary-foreground/90">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <UserPlus className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="font-medium text-primary-foreground">
                    Submit your details
                  </span>
                  <span className="block text-primary-foreground/75">
                    Fill in your name, email, and committee preferences.
                  </span>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <Mail className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="font-medium text-primary-foreground">
                    Wait for approval
                  </span>
                  <span className="block text-primary-foreground/75">
                    Our team will review your request within 24-48 hours.
                  </span>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <CheckCircle className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="font-medium text-primary-foreground">
                    Get your credentials
                  </span>
                  <span className="block text-primary-foreground/75">
                    Once approved, receive your login details via email.
                  </span>
                </span>
              </li>
            </ul>
          </div>
          <p className="relative z-10 text-xs text-primary-foreground/60">
            Registration requires admin approval before access is granted.
          </p>
        </motion.div>

        <div className="flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-12 xl:px-20">
          <div className="mx-auto w-full max-w-md space-y-8">
            <div className="flex items-center gap-3 lg:hidden">
              <img
                src={brand.logoPath}
                alt=""
                className="h-10 w-10 rounded-lg border border-border bg-card object-contain p-1.5"
              />
              <div>
                <p className="text-base font-semibold">{brand.appName}</p>
                <p className="text-sm text-muted-foreground">
                  Delegate registration
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Join as a delegate
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                Fill in your details and committee choices. If approved, you'll
                receive login credentials via email.
              </p>
            </div>

            <RegisterForm />

            <p className="text-center text-sm leading-relaxed text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
