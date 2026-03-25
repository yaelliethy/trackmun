import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ocService } from "../../services/oc"
import { UserTable } from "../../components/admin/UserTable"
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

export const AdminOCPage: React.FC = () => {
  const [page, setPage] = useState(1)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [creatingUser, setCreatingUser] = useState(false)

  const queryClient = useQueryClient()
  const { startImpersonation } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ["oc", page],
    queryFn: () => ocService.list(page, PAGE_SIZE),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data: patch,
    }: {
      id: string
      data: { name?: string; council?: string | null }
    }) => ocService.update(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oc"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ocService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oc"] })
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => ocService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oc"] })
    },
  })

  const handleImpersonate = async (user: User) => {
    try {
      const { token } = await ocService.impersonate(user.id)
      startImpersonation(token, user)
    } catch (err) {
      console.error("Impersonation failed:", err)
    }
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0

  return (
    <AdminDataPageLayout
      title="Organizing committee"
      description="Manage OC accounts used for scanning, benefits, and on-site operations. Impersonation helps you reproduce issues safely."
      breadcrumbCurrent="OC members"
      totalCount={data?.total}
      isLoadingTotal={isLoading}
      action={
        <Button onClick={() => setCreatingUser(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create OC Member
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
        role="oc"
        onClose={() => setCreatingUser(false)}
        onSave={async (data) => {
          await createMutation.mutateAsync(data)
        }}
      />
    </AdminDataPageLayout>
  )
}
