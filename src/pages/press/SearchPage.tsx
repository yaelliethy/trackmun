import React, { useState, useEffect, useCallback } from "react"
import { NavLink } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PostCard } from "@/components/press/PostCard"
import { searchUsers, searchPosts } from "@/services/press"
import { useAuthStore } from "@/hooks/useAuthStore"
import { Search, Users, FileText, Loader2 } from "lucide-react"
import type { Post } from "@trackmun/shared"

export const SearchPage: React.FC = () => {
  const { user } = useAuthStore()
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [tab, setTab] = useState<"users" | "posts">("users")

  // Debounce search input (300ms)
  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["press-search-users", debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  })

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["press-search-posts", debouncedQuery],
    queryFn: () => searchPosts(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  })

  const isLoading = tab === "users" ? usersLoading : postsLoading
  const isEmpty = debouncedQuery.length > 0 && !isLoading && ((tab === "users" && users.length === 0) || (tab === "posts" && posts.length === 0))

  const roleBadgeClass: Record<string, string> = {
    admin: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    chair: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    oc: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    delegate: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    press: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search users or posts..."
          value={query}
          onChange={handleQueryChange}
          className="h-11 pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "users" | "posts")} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="users" className="flex-1">
            <Users className="mr-2 size-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="posts" className="flex-1">
            <FileText className="mr-2 size-4" />
            Posts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          {!debouncedQuery ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Users className="size-8 mb-2 opacity-40" />
              <p className="text-sm">Type to search for users</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />
              <span className="text-sm">Searching users...</span>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Users className="size-8 mb-2 opacity-40" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {users.map((u) => (
                <NavLink
                  key={u.id}
                  to={`/feed/users/${u.id}`}
                  className="flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{u.displayName}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${roleBadgeClass[u.role] ?? ""}`}
                      >
                        {u.role}
                      </span>
                    </div>
                    {u.council && (
                      <p className="text-xs text-muted-foreground mt-0.5">{u.council}</p>
                    )}
                  </div>
                </NavLink>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="posts" className="mt-4">
          {!debouncedQuery ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FileText className="size-8 mb-2 opacity-40" />
              <p className="text-sm">Type to search for posts</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />
              <span className="text-sm">Searching posts...</span>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FileText className="size-8 mb-2 opacity-40" />
              <p className="text-sm">No posts found</p>
            </div>
          ) : (
            <div className="space-y-0">
              {(posts as Post[]).map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id ?? ""}
                  currentUserRole={user?.role ?? ""}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
