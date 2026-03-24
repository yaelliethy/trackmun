import * as React from "react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"

export interface AdminListPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

function preventNavigate(
  e: React.MouseEvent<HTMLAnchorElement>,
  fn: () => void
) {
  e.preventDefault()
  fn()
}

export function AdminListPagination({
  page,
  totalPages,
  onPageChange,
  className,
}: AdminListPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <Pagination className={cn("mx-auto w-full max-w-full", className)}>
      <PaginationContent className="flex-wrap gap-1">
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) =>
              preventNavigate(e, () => onPageChange(Math.max(1, page - 1)))
            }
            className={
              page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
            }
          />
        </PaginationItem>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <PaginationItem key={p}>
            <PaginationLink
              href="#"
              isActive={page === p}
              onClick={(e) => preventNavigate(e, () => onPageChange(p))}
              className={cn(
                "min-w-[2.25rem] cursor-pointer",
                page === p && "pointer-events-none"
              )}
            >
              {p}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) =>
              preventNavigate(e, () =>
                onPageChange(Math.min(totalPages, page + 1))
              )
            }
            className={
              page === totalPages
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
