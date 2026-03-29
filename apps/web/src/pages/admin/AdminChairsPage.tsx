import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { chairsService } from "../../services/chairs"
import { UserTable } from "../../components/admin/UserTable"
import { UserFilters, UserFilterValues } from "../../components/admin/UserFilters"
import { UserEditModal } from "../../components/admin/UserEditModal"
import { UserDeleteModal } from "../../components/admin/UserDeleteModal"
import { UserCreateModal } from "../../components/admin/UserCreateModal"
import { User } from "@trackmun/shared"
import { useAuthStore } from "../../hooks/useAuthStore"
import { AdminDataPageLayout } from "../../components/admin/AdminDataPageLayout"
import { AdminListPagination } from "../../components/admin/AdminListPagination"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

const PAGE_SIZE = 20

export const AdminChairsPage: React.FC = () => {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<UserFilterValues>({})
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [creatingUser, setCreatingUser] = useState(false)

  const queryClient = useQueryClient()
  const { startImpersonation } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ["chairs", page, filters],
    queryFn: () => chairsService.list(page, PAGE_SIZE, filters),
  })

  const handleFiltersChange = (newFilters: UserFilterValues) => {
    setFilters(newFilters)
    setPage(1)
  }

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data: patch,
    }: {
      id: string
      data: { name?: string; council?: string | null }
    }) => chairsService.update(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chairs"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => chairsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chairs"] })
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => chairsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chairs"] })
    },
  })

  const handleImpersonate = async (user: User) => {
    try {
      const { token } = await chairsService.impersonate(user.id)
      startImpersonation(token, user)
    } catch (err) {
      console.error("Impersonation failed:", err)
    }
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0

  return (
    <AdminDataPageLayout
      title="Chairs"
      description="Oversee chair accounts, committee alignment, and awards workflows. Use impersonation to validate the chair experience end-to-end."
      breadcrumbCurrent="Chairs"
      totalCount={data?.total}
      isLoadingTotal={isLoading}
      action={
        <Button onClick={() => setCreatingUser(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Chair
        </Button>
      }
      footer={
        <AdminListPagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      }
    >
      <UserFilters showCouncil onFiltersChange={handleFiltersChange} />
      <UserTable
        users={data?.users ?? []}
        isLoading={isLoading}
        onEdit={setEditingUser}
        onDelete={setDeletingUser}
        onImpersonate={handleImpersonate}
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

      <UserCreateModal
        isOpen={creatingUser}
        role="chair"
        onClose={() => setCreatingUser(false)}
        onSave={async (data) => {
          await createMutation.mutateAsync(data)
        }}
      />
    </AdminDataPageLayout>
  )
}
