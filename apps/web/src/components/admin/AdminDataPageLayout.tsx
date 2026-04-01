import * as React from "react"
import { Link } from "react-router-dom"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export interface AdminDataPageLayoutProps {
  title: string
  description: string
  breadcrumbCurrent: string
  totalCount?: number
  isLoadingTotal?: boolean
  children: React.ReactNode
  footer?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function AdminDataPageLayout({
  title,
  description,
  breadcrumbCurrent,
  totalCount,
  isLoadingTotal,
  children,
  footer,
  action,
  className,
}: AdminDataPageLayoutProps) {
  return (
    <div className={cn("space-y-8", className)}>
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/admin/delegates" className="text-muted-foreground hover:text-foreground transition-colors">
                Admin
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium">{breadcrumbCurrent}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-2xl space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {(totalCount !== undefined || isLoadingTotal) && (
              <span className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                {isLoadingTotal ? (
                  <Skeleton className="inline-block h-3.5 w-8" />
                ) : (
                  totalCount
                )}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {action && (
          <div className="flex shrink-0 items-start">{action}</div>
        )}
      </div>

      {/* Table/content area — no card wrapper, clean border */}
      <div className="overflow-hidden rounded-md border border-border/70 bg-card shadow-sm">
        {children}
      </div>

      {/* Footer (pagination) */}
      {footer && (
        <div className="flex justify-center pb-2">{footer}</div>
      )}
    </div>
  )
}
