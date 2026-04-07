import React, { useState } from "react"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { fetchReplies, createReply, pressKeys } from "@/services/press"
import type { FeedResponse } from "@trackmun/shared"

const roleBadgeClass: Record<string, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  chair: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  oc: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  delegate: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
}

interface ReplyListProps {
  postId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ReplyList: React.FC<ReplyListProps> = ({
  postId,
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient()
  const [replyBody, setReplyBody] = useState("")

  const { data, isLoading, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: pressKeys.replies(postId),
    queryFn: ({ pageParam }) =>
      fetchReplies(postId, pageParam as number | undefined),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: open,
    initialPageParam: undefined as number | undefined,
  })

  const replies = data?.pages.flatMap((p) => p.replies) ?? []

  const replyMutation = useMutation({
    mutationFn: (body: string) => createReply(postId, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pressKeys.replies(postId) })
      queryClient.setQueriesData(
        { queryKey: pressKeys.feed() },
        (old: FeedResponse | undefined) =>
          old
            ? {
                ...old,
                posts: old.posts.map((p) =>
                  p.id === postId
                    ? { ...p, replyCount: p.replyCount + 1 }
                    : p
                ),
              }
            : old
      )
      setReplyBody("")
      toast.success("Reply posted")
    },
    onError: () => toast.error("Failed to post reply"),
  })

  const handleReply = () => {
    if (!replyBody.trim()) return
    replyMutation.mutate(replyBody.trim())
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader className="px-0">
          <SheetTitle>Replies</SheetTitle>
        </SheetHeader>

        <Separator />

        {/* Replies list */}
        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Loading replies...
            </div>
          ) : replies.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              No replies yet
            </div>
          ) : (
            <div>
              {replies.map((reply) => {
                const initials = reply.authorName
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()

                return (
                  <div
                    key={reply.id}
                    className="flex gap-3 px-4 py-3 border-b"
                  >
                    <Avatar className="size-8 rounded-full bg-muted shrink-0">
                      <AvatarFallback className="rounded-full bg-muted text-xs font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm truncate">
                          {reply.authorName}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize",
                            roleBadgeClass[reply.authorRole] ?? ""
                          )}
                        >
                          {reply.authorRole}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatDistanceToNow(
                            new Date(reply.createdAt * 1000),
                            { addSuffix: true }
                          )}
                        </span>
                      </div>
                      <div className="mt-1 text-sm whitespace-pre-wrap break-words">
                        {reply.body}
                      </div>
                    </div>
                  </div>
                )
              })}

              {hasNextPage && (
                <div className="flex justify-center py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchNextPage()}
                  >
                    Load more
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Compose reply */}
        <div className="flex gap-2 pt-2">
          <textarea
            className="flex-1 resize-none text-sm placeholder:text-muted-foreground bg-transparent outline-none border-none focus-visible:ring-0 min-h-[40px] max-h-[80px]"
            placeholder="Write a reply..."
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            rows={2}
          />
          <Button
            size="sm"
            className="shrink-0 self-end"
            disabled={!replyBody.trim() || replyMutation.isPending}
            isLoading={replyMutation.isPending}
            onClick={handleReply}
          >
            Reply
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
