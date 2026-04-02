import React, { useEffect, useId, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Card } from "@/components/ui/card"
import { Camera, ScanLine } from "lucide-react"

interface QRScannerProps {
  onScan: (decodedText: string) => void
  isScanning: boolean
}

const DEFAULT_ASPECT_RATIO = 4 / 3
const SCAN_FPS = 10

function clearScannerRegion(regionId: string) {
  const region = document.getElementById(regionId)
  if (!region) return

  const videos = region.querySelectorAll("video")
  videos.forEach((video) => {
    const stream = video.srcObject as MediaStream | null
    stream?.getTracks().forEach((track) => track.stop())
    video.srcObject = null
  })

  region.innerHTML = ""
}

async function releaseCamera(scanner: Html5Qrcode, stream: MediaStream | null) {
  try {
    if (scanner.isScanning) {
      await scanner.stop()
    }
  } catch (_) { /* ignore */ }
  try {
    scanner.clear()
  } catch (_) { /* ignore */ }
  // Force-stop all camera tracks so the browser turns off the indicator light
  stream?.getTracks().forEach((t) => t.stop())
}

function isExpectedScannerError(err: unknown) {
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  return message.includes("aborted") || message.includes("not allowed to define cross-origin object")
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, isScanning }) => {
  const onScanRef = useRef(onScan)
  // Holds both scanner instance and its stream together so cleanup always has both
  const activeRef = useRef<{ scanner: Html5Qrcode; stream: MediaStream | null } | null>(null)
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO)
  const scannerRegionId = useId().replace(/:/g, "_")

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    if (!isScanning) return

    // cancelled is set to true if isScanning flips to false while start() is still resolving
    let cancelled = false

      ; (async () => {
        try {
          // Guard against duplicated video nodes in dev/StrictMode remounts
          clearScannerRegion(scannerRegionId)
          const scanner = new Html5Qrcode(scannerRegionId)

          const SCAN_COOLDOWN = 3000 // ms
          const lastScanRef = { text: "", time: 0 }

          await scanner.start(
            { facingMode: "environment" },
            {
              fps: SCAN_FPS,
            },
            (decodedText) => {
              const now = Date.now()
              if (decodedText === lastScanRef.text && now - lastScanRef.time < SCAN_COOLDOWN) {
                return
              }
              lastScanRef.text = decodedText
              lastScanRef.time = now
              onScanRef.current(decodedText)
            },
            () => { /* frame decode error - ignore */ }
          )

          // Capture the stream now that the video element exists in the DOM
          const videoEl = document.getElementById(scannerRegionId)?.querySelector("video") as HTMLVideoElement | null
          const stream = (videoEl?.srcObject as MediaStream) ?? null
          const streamAspectRatio = stream?.getVideoTracks()[0]?.getSettings().aspectRatio
          const metadataAspectRatio =
            videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0
              ? videoEl.videoWidth / videoEl.videoHeight
              : null
          const nextAspectRatio = streamAspectRatio && Number.isFinite(streamAspectRatio) && streamAspectRatio > 0
            ? streamAspectRatio
            : metadataAspectRatio

          if (nextAspectRatio) {
            setAspectRatio(nextAspectRatio)
          }

          if (cancelled) {
            // Cleanup already ran before start() finished — stop immediately
            releaseCamera(scanner, stream)
            clearScannerRegion(scannerRegionId)
            return
          }

          activeRef.current = { scanner, stream }
        } catch (err) {
          if (!isExpectedScannerError(err)) {
            console.error("Failed to start QR scanner:", err)
          }
        }
      })()

    return () => {
      cancelled = true
      if (activeRef.current) {
        const { scanner, stream } = activeRef.current
        activeRef.current = null
        releaseCamera(scanner, stream)
      }
      // Always clear any leftover video/canvas nodes
      clearScannerRegion(scannerRegionId)
    }
  }, [isScanning, scannerRegionId])

  return (
    <Card className="w-full max-w-2xl overflow-hidden border border-border/70 bg-card shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ScanLine className="size-4 text-primary" />
          QR Scanner
        </div>
        <div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${isScanning ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
          <Camera className="size-3" />
          {isScanning ? "Camera active" : "Paused"}
        </div>
      </div>
      <div className="relative w-full bg-background" style={{ aspectRatio }}>
        <div id={scannerRegionId} className="h-full w-full" />
        <style>
          {`
          #${scannerRegionId}, #${scannerRegionId} > div {
            background: transparent !important;
            width: 100% !important;
            height: 100% !important;
          }
          #${scannerRegionId} video {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
            background: transparent !important;
          }
        `}
        </style>
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white backdrop-blur-[1px]">
            Scanner paused
          </div>
        )}
        <div className="pointer-events-none absolute left-6 top-6 size-10 rounded-tl-xl border-l-2 border-t-2 border-primary/50" />
        <div className="pointer-events-none absolute right-6 top-6 size-10 rounded-tr-xl border-r-2 border-t-2 border-primary/50" />
        <div className="pointer-events-none absolute bottom-6 left-6 size-10 rounded-bl-xl border-b-2 border-l-2 border-primary/50" />
        <div className="pointer-events-none absolute bottom-6 right-6 size-10 rounded-br-xl border-b-2 border-r-2 border-primary/50" />
      </div>
    </Card>
  )
}
