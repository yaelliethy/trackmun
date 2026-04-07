import React from "react"
import { useParams, NavLink } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { getUserProfile } from "@/services/press"
import { PostCard } from "@/components/press/PostCard"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuthStore } from "@/hooks/useAuthStore"
import { ArrowLeft, Loader2 } from "lucide-react"
import type { Post } from "@trackmun/shared"

const roleBadgeClass: Record<string, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  chair: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  oc: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  delegate: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  press: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
}

export const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>()
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ["press-user-profile", userId],
    queryFn: () => getUserProfile(userId!),
    enabled: !!userId,
  })

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data?.user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-muted-foreground">User not found.</p>
      </div>
    )
  }

  const { user: profileUser, posts } = data
  const initials = profileUser.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <NavLink
        to="/feed"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="size-4" />
        Back to feed
      </NavLink>

      {/* Profile header */}
      <div className="rounded-lg border bg-card p-6 mb-6">
        <div className="flex items-start gap-4">
          <Avatar className="size-20 rounded-full bg-muted shrink-0">
            <AvatarFallback className="text-2xl font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">{profileUser.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${roleBadgeClass[profileUser.role] ?? "bg-muted text-muted-foreground"}`}
              >
                {profileUser.role}
              </span>
            </div>
            {profileUser.council && (
              <p className="text-sm text-muted-foreground mt-2">
                Council: {profileUser.council}
              </p>
            )}
            {profileUser.chairTitle && (
              <p className="text-sm text-muted-foreground mt-1">
                {profileUser.chairTitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Posts timeline */}
      <div className="space-y-0 rounded-lg border bg-card overflow-hidden">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <p className="text-sm">No posts yet</p>
          </div>
        ) : (
          (posts as Post[]).map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id ?? ""}
              currentUserRole={user?.role ?? ""}
            />
          ))
        )}
      </div>
    </div>
  )
}
