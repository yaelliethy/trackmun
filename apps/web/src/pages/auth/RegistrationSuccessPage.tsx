import React from "react"
import { Link } from "react-router-dom"
import { ModeToggle } from "@/components/mode-toggle"
import brand from "@/config/brand"
import { motion } from "framer-motion"
import { CheckCircle, Mail, Clock, ArrowRight } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const RegistrationSuccessPage: React.FC = () => {
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
              You're almost there!
            </h2>
            <p className="text-base leading-relaxed text-primary-foreground/85">
              Your registration has been submitted successfully. We're excited to
              have you join our conference community.
            </p>
            <ul className="space-y-4 text-sm text-primary-foreground/90">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <Mail className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="font-medium text-primary-foreground">
                    Check your email
                  </span>
                  <span className="block text-primary-foreground/75">
                    Verify your account through the confirmation link we sent.
                  </span>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <Clock className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="font-medium text-primary-foreground">
                    Admin review
                  </span>
                  <span className="block text-primary-foreground/75">
                    Our team will review your registration within 24-48 hours.
                  </span>
                </span>
              </li>
            </ul>
          </div>
          <p className="relative z-10 text-xs text-primary-foreground/60">
            Questions? Contact our support team for assistance.
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
                  Registration successful
                </p>
              </div>
            </div>

            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center"
              >
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </motion.div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Request submitted!
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                Thank you for registering. Your account is pending admin approval.
              </p>
            </div>

            <Card className="border-border/80 shadow-lg">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-lg font-semibold">
                  What happens next?
                </CardTitle>
                <CardDescription>
                  Here's what to expect after submitting your registration.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Verify your email</p>
                    <p className="text-xs text-muted-foreground">
                      Check your inbox for a verification link. Click it to confirm
                      your email address.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Wait for admin approval</p>
                    <p className="text-xs text-muted-foreground">
                      Our team will review your registration and committee choices.
                      This typically takes 24-48 hours.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    3
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Get started</p>
                    <p className="text-xs text-muted-foreground">
                      Once approved, you'll receive full access to your profile,
                      QR code, and all conference features.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button variant="outline" className="w-full" asChild>
                <Link to="/login">
                  Go to Login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Need help? Contact your conference administrator or check your spam
                folder for the verification email.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
