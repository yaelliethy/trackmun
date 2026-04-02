import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { adminsService } from "../../services/admins"
import { UserTable } from "../../components/admin/UserTable"
import { UserFilters, UserFilterValues } from "../../components/admin/UserFilters"
import { UserEditModal } from "../../components/admin/UserEditModal"
import { UserDeleteModal } from "../../components/admin/UserDeleteModal"
import { UserCreateModal } from "../../components/admin/UserCreateModal"
import { User } from "@trackmun/shared"
import { AdminDataPageLayout } from "../../components/admin/AdminDataPageLayout"
import { AdminListPagination } from "../../components/admin/AdminListPagination"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

const PAGE_SIZE = 20

export const AdminAdminsPage: React.FC = () => {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<UserFilterValues>({})
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [creatingUser, setCreatingUser] = useState(false)

  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["admins", page, filters],
    queryFn: () => adminsService.list(page, PAGE_SIZE, filters),
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
    }) => adminsService.update(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] })
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => adminsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] })
    },
  })

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0

  return (
    <AdminDataPageLayout
      title="Administrators"
      description="Manage core platform administrators. These users have unrestricted access."
      breadcrumbCurrent="Admins"
      totalCount={data?.total}
      isLoadingTotal={isLoading}
      action={
        <Button onClick={() => setCreatingUser(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Admin Member
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
      <UserFilters onFiltersChange={handleFiltersChange} />
      <UserTable
        users={data?.users ?? []}
        isLoading={isLoading}
        showCouncilColumn={false}
        onEdit={setEditingUser}
        onDelete={setDeletingUser}
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
        role="admin"
        onClose={() => setCreatingUser(false)}
        onSave={async (data) => {
          await createMutation.mutateAsync(data)
        }}
      />
    </AdminDataPageLayout>
  )
}
