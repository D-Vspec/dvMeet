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
    // Diagnostic logging
    console.log("Received stream:", stream);
    
    if (stream) {
      console.log("Video tracks:", stream.getVideoTracks());
      console.log("Audio tracks:", stream.getAudioTracks());
      
      stream.getVideoTracks().forEach(track => {
        console.log("Video track enabled:", track.enabled);
        console.log("Video track muted:", track.muted);
        console.log("Video track state:", track.readyState);
      });
    }

    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      
      // Additional event listeners for diagnostics
      videoRef.current.addEventListener('play', () => {
        console.log('Video started playing');
      });
      
      videoRef.current.addEventListener('error', (e) => {
        console.error('Video element error:', e);
      });
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [stream])

  return stream ? (
    <video 
      ref={videoRef} 
      autoPlay 
      playsInline 
      muted={muted} 
      className={className} 
    />
  ) : (
    <div className={`bg-gray-500 w-full h-full flex items-center justify-center ${className}`}>
      No Video Available
    </div>
  );
}