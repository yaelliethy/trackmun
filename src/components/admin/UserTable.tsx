import React from "react"
import { User } from "@trackmun/shared"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Edit, Trash2, UserSearch, ExternalLink, Users, ClipboardList, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface UserTableProps {
  users: User[]
  isLoading: boolean
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onViewResponses?: (user: User) => void
  /** When false, the Council column is hidden (e.g. OC and Admins lists). */
  showCouncilColumn?: boolean
  onImpersonate?: (user: User) => void
  onTogglePaymentStatus?: (
    user: User,
    field: "depositPaymentStatus" | "fullPaymentStatus",
    current: string
  ) => void
  onReviewPayment?: (user: User) => void
  /** When set, shows a spinner on the matching payment badge while the toggle request is in flight. */
  paymentPending?: {
    userId: string
    field: "depositPaymentStatus" | "fullPaymentStatus"
  } | null
}

function PaymentBadge({
  status,
  onClick,
  isPending,
}: {
  status: string
  onClick?: () => void
  isPending?: boolean
}) {
  const isPaid = status === "paid"
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className={`inline-flex items-center justify-center gap-1 min-w-[4.25rem] rounded px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide transition-colors disabled:opacity-70 ${
        isPaid
          ? "bg-success/10 text-success hover:bg-success/20"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
      title="Click to toggle payment status"
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
      ) : null}
      {isPaid ? "PAID" : "PENDING"}
    </button>
  )
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  isLoading,
  onEdit,
  onDelete,
  onViewResponses,
  showCouncilColumn = true,
  onImpersonate,
  onTogglePaymentStatus,
  onReviewPayment,
  paymentPending,
}) => {
  const isDelegateTable = users.some((u) => u.role === "delegate")


  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
            <TableHead className="w-[36%] pl-6 text-[11px] font-semibold tracking-caps text-muted-foreground">
              User
            </TableHead>
            {showCouncilColumn && (
              <TableHead className="text-[11px] font-semibold tracking-caps text-muted-foreground">
                Council
              </TableHead>
            )}
            {isDelegateTable && (
              <>
                <TableHead className="text-[11px] font-semibold tracking-caps text-muted-foreground">
                  Payments
                </TableHead>
                <TableHead className="text-[11px] font-semibold tracking-caps text-muted-foreground">
                  Attended
                </TableHead>
              </>
            )}
            <TableHead className="w-[1%] pr-6 text-right text-[11px] font-semibold tracking-caps text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i} className="border-border/50">
                <TableCell className="pl-6 py-4">
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </TableCell>
                {showCouncilColumn && (
                  <TableCell className="py-4">
                    <Skeleton className="h-3.5 w-24" />
                  </TableCell>
                )}
                {isDelegateTable && (
                  <>
                    <TableCell className="py-4">
                      <Skeleton className="h-5 w-28 rounded" />
                    </TableCell>
                    <TableCell className="py-4">
                      <Skeleton className="h-5 w-12 rounded" />
                    </TableCell>
                  </>
                )}
                <TableCell className="pr-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : users.length === 0 ? (
            <TableRow className="border-0 hover:bg-transparent">
              <TableCell colSpan={5} className="p-0">
                <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground/50">
                    <Users className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="max-w-xs space-y-1">
                    <p className="text-sm font-semibold text-foreground">No records found</p>
                    <p className="text-sm text-muted-foreground">
                      When accounts are created for this role, they will appear here.
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow
                key={user.id}
                className="border-border/50 transition-colors hover:bg-muted/25"
              >
                {/* User info */}
                <TableCell className="pl-6 align-middle">
                  <div className="flex flex-col gap-0.5 py-1">
                    <span className="text-sm font-medium text-foreground">
                      {user.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </TableCell>

                {showCouncilColumn && (
                  <TableCell className="align-middle text-sm text-muted-foreground">
                    {user.council?.trim() ? user.council : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                )}

                {/* Payment status and Attendance */}
                {isDelegateTable && (
                  <>
                    <TableCell className="align-middle">
                      {user.role === "delegate" && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground/70 w-11 shrink-0">
                              Deposit
                            </span>
                            <PaymentBadge
                              status={user.depositPaymentStatus || "pending"}
                              isPending={
                                paymentPending?.userId === user.id &&
                                paymentPending.field === "depositPaymentStatus"
                              }
                              onClick={() =>
                                onTogglePaymentStatus?.(
                                  user,
                                  "depositPaymentStatus",
                                  user.depositPaymentStatus || "pending"
                                )
                              }
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground/70 w-11 shrink-0">
                              Full
                            </span>
                            <PaymentBadge
                              status={user.fullPaymentStatus || "pending"}
                              isPending={
                                paymentPending?.userId === user.id &&
                                paymentPending.field === "fullPaymentStatus"
                              }
                              onClick={() =>
                                onTogglePaymentStatus?.(
                                  user,
                                  "fullPaymentStatus",
                                  user.fullPaymentStatus || "pending"
                                )
                              }
                            />
                          </div>
                          {user.paymentProofR2Key && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-[11px] text-primary hover:text-primary"
                              onClick={() => onReviewPayment?.(user)}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Review payment
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-middle">
                      {user.role === "delegate" && (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center min-w-[2rem] rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide text-foreground">
                            {user.daysAttended || 0}
                          </span>
                          <span className="text-[10px] text-muted-foreground">days</span>
                        </div>
                      )}
                    </TableCell>
                  </>
                )}

                {/* Actions */}
                <TableCell className="pr-6 text-right align-middle">
                  <div className="flex justify-end gap-0.5">
                    {onViewResponses && user.role === "delegate" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary/70 hover:bg-primary/8 hover:text-primary"
                            onClick={() => onViewResponses(user)}
                            aria-label={`View responses for ${user.name}`}
                          >
                            <ClipboardList className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Responses</TooltipContent>
                      </Tooltip>
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => onEdit(user)}
                          aria-label={`Edit ${user.name}`}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>

                    {onImpersonate &&
                      (user.role === "oc" || user.role === "chair") && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary/70 hover:bg-primary/8 hover:text-primary"
                              onClick={() => onImpersonate(user)}
                              aria-label={`Impersonate ${user.name}`}
                            >
                              <UserSearch className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Impersonate</TooltipContent>
                        </Tooltip>
                      )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive/60 hover:bg-destructive/8 hover:text-destructive"
                          onClick={() => onDelete(user)}
                          aria-label={`Delete ${user.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
