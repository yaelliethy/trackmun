import React, { useState } from "react"
import type { Post } from "@trackmun/shared"
import { motion } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import {
  MessageCircle,
  Heart,
  MoreHorizontal,
  Trash2,
} from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { NavLink } from "react-router-dom"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { MediaGrid } from "./MediaGrid"
import { PostThread } from "./PostThread"
import { toggleLike, deletePost, pressKeys } from "@/services/press"
import type { FeedResponse } from "@trackmun/shared"

const roleBadgeClass: Record<string, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  chair: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  oc: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  delegate: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
}

interface PostCardProps {
  post: Post
  currentUserId: string
  currentUserRole: string
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  currentUserRole,
}) => {
  const queryClient = useQueryClient()
  const [isExpanded, setIsExpanded] = useState(false)

  const canDelete =
    post.authorId === currentUserId || currentUserRole === "admin"

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(post.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pressKeys.feed() })
      toast.success("Post deleted")
    },
    onError: () => toast.error("Failed to delete post"),
  })

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(post.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: pressKeys.feed() })
      const snapshot = queryClient.getQueryData(pressKeys.feed())
      queryClient.setQueriesData(
        { queryKey: pressKeys.feed() },
        (old: FeedResponse | undefined) => {
          if (!old) return old
          return {
            ...old,
            posts: old.posts.map((p) =>
              p.id !== post.id
                ? p
                : {
                    ...p,
                    likedByCurrentUser: !p.likedByCurrentUser,
                    likesCount: p.likedByCurrentUser
                      ? p.likesCount - 1
                      : p.likesCount + 1,
                  }
            ),
          }
        }
      )
      return { snapshot }
    },
    onError: (_err, _vars, ctx: any) => {
      if (ctx?.snapshot)
        queryClient.setQueryData(pressKeys.feed(), ctx.snapshot)
      toast.error("Failed to update like")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pressKeys.feed() })
    },
  })

  const initials = post.authorName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const handleCardClick = (e: React.MouseEvent) => {
    // Only toggle if they click the card body, not buttons/links
    if ((e.target as HTMLElement).closest('button, a')) return
    setIsExpanded(!isExpanded)
  }

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        layout
        className="border-b"
      >
        <div
          className="flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
          onClick={handleCardClick}
        >
          {/* Avatar */}
          <Avatar className="size-10 rounded-full bg-muted shrink-0">
            <AvatarFallback className="rounded-full bg-muted text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-1.5">
              <NavLink
                to={`/feed/users/${post.authorId}`}
                className="font-bold text-sm truncate hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {post.authorName}
              </NavLink>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize",
                  roleBadgeClass[post.authorRole] ?? ""
                )}
              >
                {post.authorRole}
              </span>
              <span className="text-muted-foreground mx-1">·</span>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt * 1000), {
                  addSuffix: true,
                })}
              </span>

              {/* Delete dropdown */}
              {canDelete && (
                <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 -mr-2 text-muted-foreground hover:text-foreground"
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => deleteMutation.mutate()}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="mt-1 text-[15px] leading-normal whitespace-pre-wrap break-words">
              {post.body}
            </div>

            {/* Media */}
            {post.media && post.media.length > 0 && (
              <div className="mt-3">
                <MediaGrid media={post.media} />
              </div>
            )}

            {/* Action bar */}
            <div className="flex gap-6 mt-3 text-muted-foreground">
              {/* Reply button */}
              <button
                className="flex items-center gap-2 text-[13px] hover:text-blue-500 transition-colors group"
                onClick={(e) => handleActionClick(e, () => setIsExpanded(!isExpanded))}
              >
                <div className="p-1.5 rounded-full group-hover:bg-blue-500/10 transition-colors">
                  <MessageCircle className="size-4" />
                </div>
                <span>{post.replyCount}</span>
              </button>

              {/* Like button */}
              <button
                className={cn(
                  "flex items-center gap-2 text-[13px] transition-colors group",
                  post.likedByCurrentUser ? "text-pink-600" : "hover:text-pink-600"
                )}
                onClick={(e) => handleActionClick(e, () => likeMutation.mutate())}
              >
                <div className={cn(
                  "p-1.5 rounded-full group-hover:bg-pink-600/10 transition-colors",
                  post.likedByCurrentUser && "bg-pink-600/10"
                )}>
                  <motion.div
                    key={post.likedByCurrentUser ? "on" : "off"}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    <Heart
                      className={cn(
                        "size-4",
                        post.likedByCurrentUser && "fill-current"
                      )}
                    />
                  </motion.div>
                </div>
                <span>{post.likesCount}</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Expanded Thread */}
      {isExpanded && (
        <PostThread
          postId={post.id}
          authorId={post.authorId}
          authorName={post.authorName}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      )}
    </>
  )
}