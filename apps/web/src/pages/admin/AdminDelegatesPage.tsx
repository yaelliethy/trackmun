import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { delegatesService } from "../../services/delegates"
import { UserTable } from "../../components/admin/UserTable"
import { UserFilters, UserFilterValues } from "../../components/admin/UserFilters"
import { UserEditModal } from "../../components/admin/UserEditModal"
import { UserDeleteModal } from "../../components/admin/UserDeleteModal"
import { PaymentProofReviewModal } from "../../components/admin/PaymentProofReviewModal"
import { User, DelegateResponse } from "@trackmun/shared"
import { AdminDataPageLayout } from "../../components/admin/AdminDataPageLayout"
import { AdminListPagination } from "../../components/admin/AdminListPagination"
import { adminRegistrationService } from "../../services/registration"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"

const PAGE_SIZE = 20

export const AdminDelegatesPage: React.FC = () => {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<UserFilterValues>({})
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [reviewingPaymentUser, setReviewingPaymentUser] = useState<User | null>(null)
  const [selectedResponse, setSelectedResponse] = useState<DelegateResponse | null>(null)

  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["delegates", page, filters],
    queryFn: () => delegatesService.list(page, PAGE_SIZE, filters),
  })

  const handleFiltersChange = (newFilters: UserFilterValues) => {
    setFilters(newFilters)
    setPage(1)
  }

  const { data: allResponses } = useQuery({
    queryKey: ["admin-registration-responses"],
    queryFn: () => adminRegistrationService.getResponses(),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data: patch,
    }: {
      id: string
      data: { name?: string; council?: string | null }
    }) => delegatesService.update(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegates"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => delegatesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegates"] })
    },
  })

  const paymentMutation = useMutation({
    mutationFn: async ({
      id,
      field,
      status,
    }: {
      id: string
      field: "depositPaymentStatus" | "fullPaymentStatus"
      status: "pending" | "paid"
    }) => {
      const payload: Record<string, "pending" | "paid"> = {}
      payload[field] = status
      await delegatesService.updatePaymentStatus(id, payload)
      await queryClient.refetchQueries({ queryKey: ["delegates"] })
      await queryClient.refetchQueries({ queryKey: ["delegate-profile"] })
    },
  })

  const handleViewResponses = (user: User) => {
    const response = allResponses?.find((r) => r.userId === user.id)
    if (response) {
      setSelectedResponse(response)
    } else {
      toast.error("No registration responses found for this delegate.")
    }
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0

  return (
    <AdminDataPageLayout
      title="Delegates"
      description="Review delegate accounts, committee assignments, and profile details. Edits apply across the platform immediately."
      breadcrumbCurrent="Delegates"
      totalCount={data?.total}
      isLoadingTotal={isLoading}
      footer={
        <AdminListPagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      }
    >
      <UserFilters
        showRegistrationStatus
        showDepositPaymentStatus
        showFullPaymentStatus
        onFiltersChange={handleFiltersChange}
      />
      <UserTable
        users={data?.users ?? []}
        isLoading={isLoading}
        onEdit={setEditingUser}
        onDelete={setDeletingUser}
        onViewResponses={handleViewResponses}
        onReviewPayment={setReviewingPaymentUser}
        paymentPending={
          paymentMutation.isPending && paymentMutation.variables
            ? {
                userId: paymentMutation.variables.id,
                field: paymentMutation.variables.field,
              }
            : null
        }
        onTogglePaymentStatus={(user, field, currentStatus) => {
          paymentMutation.mutate({
            id: user.id,
            field,
            status: currentStatus === "paid" ? "pending" : "paid"
          })
        }}
      />

      <UserEditModal
        user={editingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSave={async (id, patch) => {
          await updateMutation.mutateAsync({ id, data: patch })
        }}
      />

      <UserDeleteModal
        user={deletingUser}
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={async (id) => {
          await deleteMutation.mutateAsync(id)
        }}
      />

      <PaymentProofReviewModal
        user={reviewingPaymentUser}
        isOpen={!!reviewingPaymentUser}
        onClose={() => setReviewingPaymentUser(null)}
      />

      <DelegateResponseSheet
        response={selectedResponse}
        onClose={() => setSelectedResponse(null)}
      />
    </AdminDataPageLayout>
  )
}

function DelegateResponseSheet({
  response,
  onClose,
}: {
  response: DelegateResponse | null
  onClose: () => void
}) {
  return (
    <Sheet open={!!response} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registration Responses</SheetTitle>
          <SheetDescription>
            Full answers provided by {response?.name} during registration.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{response?.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge
                variant={
                  response?.registrationStatus === "approved"
                    ? "success"
                    : response?.registrationStatus === "rejected"
                    ? "destructive"
                    : "secondary"
                }
              >
                {response?.registrationStatus}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            {response?.answers.map((answer) => (
              <div key={answer.questionId} className="space-y-1">
                <p className="text-sm font-medium text-primary">
                  {answer.questionLabel}
                </p>
                <div className="rounded-md bg-muted/30 p-3 text-sm">
                  {answer.value || <span className="text-muted-foreground italic">No answer provided</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
