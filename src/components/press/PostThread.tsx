import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { NavLink } from "react-router-dom"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import { fetchReplies, createReply, deleteReply, pressKeys } from "@/services/press"

interface PostThreadProps {
  postId: string
  authorId: string
  authorName: string
  currentUserId: string
  currentUserRole: string
}

export const PostThread: React.FC<PostThreadProps> = ({
  postId,
  authorId,
  authorName,
  currentUserId,
  currentUserRole,
}) => {
  const queryClient = useQueryClient()
  const [replyBody, setReplyBody] = useState("")

  const { data: replies = [], isLoading } = useQuery({
    queryKey: pressKeys.replies(postId),
    queryFn: () => fetchReplies(postId),
  })

  const submitReplyMutation = useMutation({
    mutationFn: () => createReply(postId, replyBody),
    onSuccess: () => {
      setReplyBody("")
      queryClient.invalidateQueries({ queryKey: pressKeys.replies(postId) })
      queryClient.invalidateQueries({ queryKey: pressKeys.feed() })
      toast.success("Reply posted")
    },
    onError: () => toast.error("Failed to post reply"),
  })

  const deleteReplyMutation = useMutation({
    mutationFn: (replyId: string) => deleteReply(postId, replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pressKeys.replies(postId) })
      queryClient.invalidateQueries({ queryKey: pressKeys.feed() })
      toast.success("Reply deleted")
    },
    onError: () => toast.error("Failed to delete reply"),
  })

  const handleSubmit = () => {
    if (!replyBody.trim()) return
    submitReplyMutation.mutate()
  }

  if (isLoading) {
    return <div className="p-4 text-center text-sm text-muted-foreground">Loading replies...</div>
  }

  return (
    <div className="bg-muted/10 border-b border-border/50">
      {/* Replies List */}
      <div className="divide-y divide-border/30">
        {replies.map((reply) => {
          const initials = reply.authorName
            .split(/\s+/)
            .map((w: string) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()

          const canDelete =
            reply.authorId === currentUserId ||
            authorId === currentUserId ||
            currentUserRole === "admin"

          return (
            <div key={reply.id} className="flex gap-3 px-4 py-3 ml-4">
              <Avatar className="size-8 rounded-full bg-muted shrink-0 mt-1">
                <AvatarFallback className="rounded-full bg-muted text-[10px] font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <NavLink
                    to={`/feed/users/${reply.authorId}`}
                    className="font-bold text-sm truncate hover:underline"
                  >
                    {reply.authorName}
                  </NavLink>
                  <span className="text-muted-foreground mx-1">·</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(reply.createdAt * 1000), {
                      addSuffix: true,
                    })}
                  </span>

                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 ml-auto text-muted-foreground hover:text-destructive"
                      onClick={() => deleteReplyMutation.mutate(reply.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>

                <div className="mt-0.5 text-sm whitespace-pre-wrap break-words">
                  {reply.body}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Reply Composer */}
      <div className="p-4 ml-4 flex gap-3 items-start border-t border-border/30">
        <div className="flex-1 min-w-0 bg-background rounded-xl border border-input focus-within:ring-1 focus-within:ring-primary shadow-sm p-1 pr-2">
          <TextareaAutosize
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder={`Reply to ${authorName}...`}
            className="w-full resize-none bg-transparent border-0 focus:ring-0 text-sm py-2 px-3 placeholder:text-muted-foreground min-h-[40px] focus-visible:outline-none"
            minRows={1}
            maxRows={4}
          />
          <div className="flex justify-end pb-1 pt-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!replyBody.trim() || submitReplyMutation.isPending}
              className="h-7 px-3 text-xs rounded-full font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitReplyMutation.isPending ? "Posting..." : "Reply"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}