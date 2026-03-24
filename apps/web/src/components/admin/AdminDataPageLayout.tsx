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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  className,
}: AdminDataPageLayoutProps) {
  return (
    <div className={cn("space-y-8", className)}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/admin/delegates">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{breadcrumbCurrent}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {(totalCount !== undefined || isLoadingTotal) && (
          <div className="flex shrink-0 flex-col gap-1 rounded-xl border border-border/80 bg-card px-6 py-4 text-left shadow-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total records
            </span>
            {isLoadingTotal ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <span className="text-3xl font-semibold tabular-nums text-foreground">
                {totalCount}
              </span>
            )}
          </div>
        )}
      </div>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-6">
          <CardTitle className="text-lg font-semibold tracking-tight">
            Directory
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Search, edit, or remove users in this role. Changes apply immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">{children}</CardContent>
      </Card>

      {footer ? <div className="flex justify-center pb-2">{footer}</div> : null}
    </div>
  )
}
