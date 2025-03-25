
"use client"

import { useEffect, useRef } from "react"

interface VideoStreamProps {
  stream: MediaStream | null
  muted?: boolean
  className?: string
}

export function VideoStream({ stream, muted = false, className = "" }: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [stream])

  return <video ref={videoRef} autoPlay playsInline muted={muted} className={className} />
}

