import React, { useEffect, useState } from "react"
import { AnimatePresence } from "framer-motion"
import { useQuery } from "@tanstack/react-query"

import { PostCard } from "@/components/press/PostCard"
import { PostComposer } from "@/components/press/PostComposer"
import { fetchFeed, pressKeys } from "@/services/press"
import { useAuthStore } from "@/hooks/useAuthStore"
import type { FeedResponse } from "@trackmun/shared"
import { Button } from "@/components/ui/button"

export const FeedPage: React.FC = () => {
  const { user } = useAuthStore()
  const [pages, setPages] = useState<FeedResponse[]>([])
  const [isFetchingMore, setIsFetchingMore] = useState(false)

  const { data: firstPage, isLoading } = useQuery({
    queryKey: pressKeys.feed(),
    queryFn: () => fetchFeed(),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (firstPage) setPages([firstPage])
  }, [firstPage])

  const allPosts = pages.flatMap((p) => p.posts)
  const hasMore = !!pages[pages.length - 1]?.nextCursor

  const loadMore = async () => {
    const cursor = pages[pages.length - 1]?.nextCursor
    if (!cursor || isFetchingMore) return
    setIsFetchingMore(true)
    try {
      const nextPage = await fetchFeed(cursor)
      setPages((prev) => [...prev, nextPage])
    } finally {
      setIsFetchingMore(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-4">
        <PostComposer
          currentUserId={user?.id ?? ""}
          currentUserName={user?.name ?? ""}
        />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-3 px-4 py-3 border-b animate-pulse"
          >
            <div className="size-10 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-32" />
              <div className="h-3 bg-muted rounded w-48" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {user && (
        <PostComposer
          currentUserId={user.id}
          currentUserName={user.name}
        />
      )}

      {allPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-2xl font-semibold">Welcome to the Feed</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Be the first to post something!
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {allPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id ?? ""}
              currentUserRole={user?.role ?? ""}
            />
          ))}
        </AnimatePresence>
      )}

      {hasMore && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            onClick={loadMore}
            isLoading={isFetchingMore}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
