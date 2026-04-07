import type { PostMedia } from "@trackmun/shared"

interface MediaGridProps {
  media: PostMedia[]
}

export function MediaGrid({ media }: MediaGridProps) {
  if (!media.length) return null

  if (media.length === 1) {
    const m = media[0]
    const url = `${import.meta.env.VITE_R2_PUBLIC_URL}/${m.r2Key}`

    if (m.mediaType === "video") {
      return (
        <div className="rounded-xl overflow-hidden aspect-video mt-2">
          <video
            className="w-full h-full object-cover"
            controls
            src={url}
          />
        </div>
      )
    }

    return (
      <div className="rounded-xl overflow-hidden aspect-[4/3] mt-2">
        <img
          className="w-full h-full object-cover"
          src={url}
          alt=""
          loading="lazy"
        />
      </div>
    )
  }

  // 2 items
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden mt-2">
      {media.map((m) => {
        const url = `${import.meta.env.VITE_R2_PUBLIC_URL}/${m.r2Key}`
        return (
          <div key={m.id} className="aspect-square">
            {m.mediaType === "video" ? (
              <video
                className="w-full h-full object-cover"
                controls
                src={url}
              />
            ) : (
              <img
                className="w-full h-full object-cover"
                src={url}
                alt=""
                loading="lazy"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
