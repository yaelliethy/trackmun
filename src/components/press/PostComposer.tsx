import React, { useRef, useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Paperclip, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { createPost, getUploadUrl, uploadFileToR2, pressKeys } from "@/services/press"
import type { CreatePost } from "@trackmun/shared"

interface PostComposerProps {
  currentUserId: string
  currentUserName: string
}

export const PostComposer: React.FC<PostComposerProps> = ({
  currentUserId,
  currentUserName,
}) => {
  const queryClient = useQueryClient()
  const [body, setBody] = useState("")
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_FILES = 2
  const MAX_CHARS = 280

  const initials = currentUserName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    return () => mediaPreviews.forEach(URL.revokeObjectURL)
  }, [mediaPreviews])

  const createPostMutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pressKeys.feed() })
      toast.success("Posted!")
    },
    onError: () => toast.error("Failed to create post"),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const remaining = MAX_FILES - mediaFiles.length
    const toAdd = files.slice(0, remaining)

    const newPreviews = toAdd.map((f) => URL.createObjectURL(f))
    setMediaFiles((prev) => [...prev, ...toAdd])
    setMediaPreviews((prev) => [...prev, ...newPreviews])

    // Reset input so the same file can be re-selected
    e.target.value = ""
  }

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index])
    setMediaFiles((prev) => prev.filter((_, i) => i !== index))
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!body.trim() && mediaFiles.length === 0) return
    setUploading(true)

    try {
      // Upload media files
      const r2Keys: string[] = []
      for (const file of mediaFiles) {
        const { uploadUrl, r2Key } = await getUploadUrl({
          filename: file.name,
          mediaType: file.type.startsWith('video/') ? 'video' : 'image',
          contentType: file.type,
        })
        await uploadFileToR2(uploadUrl, file)
        r2Keys.push(r2Key)
      }

      const data: CreatePost = {
        body: body.trim(),
        mediaKeys: r2Keys,
      }

      await createPostMutation.mutateAsync(data)

      // Reset state
      setBody("")
      setMediaFiles([])
      setMediaPreviews.forEach(URL.revokeObjectURL)
      setMediaPreviews([])
    } catch {
      // Error handled by mutation
    } finally {
      setUploading(false)
    }
  }

  const charsLeft = MAX_CHARS - body.length

  return (
    <div className="border-b px-4 py-3">
      <div className="flex gap-3">
        <Avatar className="size-10 rounded-full bg-muted shrink-0">
          <AvatarFallback className="rounded-full bg-muted text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <textarea
            className="w-full resize-none text-sm placeholder:text-muted-foreground bg-transparent outline-none border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="What's happening?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX_CHARS}
            rows={3}
          />

          {/* Media previews */}
          {mediaPreviews.length > 0 && (
            <div
              className={cn(
                "grid gap-2 mt-2",
                mediaPreviews.length === 1
                  ? "grid-cols-1"
                  : "grid-cols-2"
              )}
            >
              {mediaPreviews.map((url, i) => (
                <div key={url} className="relative rounded-lg overflow-hidden aspect-video">
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    className="absolute top-1 right-1 size-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                    onClick={() => removeMedia(i)}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Separator className="my-2" />

          {/* Bottom bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
                disabled={mediaFiles.length >= MAX_FILES}
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-primary"
                onClick={() => fileInputRef.current?.click()}
                hidden={mediaFiles.length >= MAX_FILES}
              >
                <Paperclip className="size-4" />
              </Button>
              <span
                className={cn(
                  "text-xs",
                  charsLeft < 20 && charsLeft > 0 && "text-yellow-500",
                  charsLeft <= 0 && "text-red-500"
                )}
              >
                {charsLeft < 20 ? `${charsLeft}` : ""}
              </span>
            </div>

            <Button
              className="rounded-full"
              disabled={
                (!body.trim() && mediaFiles.length === 0) ||
                uploading ||
                createPostMutation.isPending
              }
              isLoading={uploading || createPostMutation.isPending}
              onClick={handleSubmit}
            >
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
