
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

  return stream ? (
    <video ref={videoRef} autoPlay playsInline muted={muted} className={className} />
  ) : (
    <div className={`bg-gray-500 w-full h-full flex items-center justify-center ${className}`}>
      No Video Available
    </div>
  );
  
}

