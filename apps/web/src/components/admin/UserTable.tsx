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
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Edit, Trash2, UserSearch, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface UserTableProps {
  users: User[]
  isLoading: boolean
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onImpersonate?: (user: User) => void
}

function roleBadge(role: string) {
  switch (role) {
    case "admin":
      return (
        <Badge variant="destructive" className="capitalize">
          admin
        </Badge>
      )
    case "chair":
      return (
        <Badge variant="warning" className="capitalize">
          chair
        </Badge>
      )
    case "oc":
      return (
        <Badge variant="secondary" className="capitalize">
          oc
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="capitalize">
          delegate
        </Badge>
      )
  }
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  isLoading,
  onEdit,
  onDelete,
  onImpersonate,
}) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
            <TableHead className="w-[32%] pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              User
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Role
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Council
            </TableHead>
            <TableHead className="w-[1%] pr-6 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i} className="border-border/60">
                <TableCell className="pl-6 py-4">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <Skeleton className="h-6 w-16 rounded-full" />
                </TableCell>
                <TableCell className="py-4">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="pr-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : users.length === 0 ? (
            <TableRow className="border-0 hover:bg-transparent">
              <TableCell colSpan={4} className="p-0">
                <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 text-muted-foreground">
                    <Users className="h-7 w-7" aria-hidden />
                  </div>
                  <div className="max-w-sm space-y-2">
                    <p className="text-base font-semibold text-foreground">
                      No users in this list
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      When accounts are created for this role, they will appear
                      here. You can refresh the page after onboarding.
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow
                key={user.id}
                className="border-border/60 transition-colors hover:bg-muted/30"
              >
                <TableCell className="pl-6 align-middle">
                  <div className="flex flex-col gap-0.5 py-1">
                    <span className="font-medium text-foreground">
                      {user.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="align-middle">
                  {roleBadge(user.role)}
                </TableCell>
                <TableCell className="align-middle text-sm text-muted-foreground">
                  {user.council?.trim() ? user.council : "—"}
                </TableCell>
                <TableCell className="pr-6 text-right align-middle">
                  <div className="flex justify-end gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-foreground"
                          onClick={() => onEdit(user)}
                          aria-label={`Edit ${user.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit user</TooltipContent>
                    </Tooltip>

                    {onImpersonate &&
                      (user.role === "oc" || user.role === "chair") && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-primary hover:bg-primary/10 hover:text-primary"
                              onClick={() => onImpersonate(user)}
                              aria-label={`Impersonate ${user.name}`}
                            >
                              <UserSearch className="h-4 w-4" />
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
                          className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => onDelete(user)}
                          aria-label={`Delete ${user.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete user</TooltipContent>
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
