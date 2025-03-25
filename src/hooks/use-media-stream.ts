"use client"

import { useState, useEffect } from "react"

interface MediaStreamOptions {
  video: boolean
  audio: boolean
}

interface MediaStreamResult {
  stream: MediaStream | null
  error: Error | null
  status: "idle" | "loading" | "success" | "error"
  restart: () => Promise<void>
}

export function useMediaStream(options: MediaStreamOptions): MediaStreamResult {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const getMediaStream = async () => {
    try {
      setStatus("loading")
      setError(null)

      // Stop any existing tracks
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: options.video,
        audio: options.audio,
      })

      setStream(mediaStream)
      setStatus("success")
      return mediaStream
    } catch (err) {
      console.error("Error accessing media devices:", err)
      setError(err instanceof Error ? err : new Error(String(err)))
      setStatus("error")
      return null
    }
  }

  useEffect(() => {
    getMediaStream()

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, []) // Only run on mount

  // When options change, update the tracks
  useEffect(() => {
    if (!stream) return

    // Update video tracks
    stream.getVideoTracks().forEach((track) => {
      track.enabled = options.video
    })

    // Update audio tracks
    stream.getAudioTracks().forEach((track) => {
      track.enabled = options.audio
    })
  }, [options.video, options.audio, stream])

  const restart = async () => {
    await getMediaStream()
  }

  return { stream, error, status, restart }
}

