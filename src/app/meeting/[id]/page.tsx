"use client"

import { useState, type FormEvent, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMobile } from "@/hooks/use-mobile"
import { useMediaStream } from "@/hooks/use-media-stream"
import { VideoStream } from "@/components/video-stream"
import { useSocket } from "@/hooks/use-socket"
import { usePeerConnections } from "@/hooks/use-peer-connections"

interface Participant {
  id?: number
  socketId?: string
  name: string
  avatar?: string
  isSelf?: boolean
  isMuted: boolean
  isVideoOff: boolean
}

interface ChatMessage {
  id: number
  sender: string
  time: string
  text: string
}

export default function MeetingRoom() {
  const params = useParams()
  const searchParams = useSearchParams()
  const meetingId = params!.id as string
  const userName = searchParams!.get("name") || "You"
  const isMobile = useMobile()

  const [participants, setParticipants] = useState<Participant[]>([])
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false)
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false)
  const [showChat, setShowChat] = useState<boolean>(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState<string>("")
  const [showParticipants, setShowParticipants] = useState<boolean>(false)
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false)
  const [isConnected, setIsConnected] = useState<boolean>(false)

  // Get media stream
  const { stream, error, status } = useMediaStream({
    video: !isVideoOff,
    audio: !isMuted,
  })

  // Get socket connection
  const socket = useSocket(meetingId, userName)

  // Get peer connections
  const { peerStreams, updatePeerStreams, isConnecting, connectionError } = usePeerConnections(
    socket,
    stream,
    meetingId,
  )

  const handleParticipantsList = (serverParticipants: Participant[]) => {
    if (!socket) return
    const selfParticipant: Participant = {
      id: 1,
      name: userName || "You",
      avatar: "/placeholder.svg?height=200&width=200",
      isSelf: true,
      isMuted,
      isVideoOff,
      socketId: socket.id,
    }

    const otherParticipants = serverParticipants
      .filter((p) => p.socketId !== socket.id)
      .map((p, index) => ({
        ...p,
        id: index + 2,
        name: p.name || "User",
        isSelf: false,
        avatar: "/placeholder.svg?height=200&width=200",
        isMuted: p.isMuted || false,
        isVideoOff: p.isVideoOff || false,
      }))

    setParticipants([selfParticipant, ...otherParticipants])
  }

  const handleParticipantJoined = (newParticipant: Participant) => {
    console.log("New participant joined:", newParticipant)

    setParticipants((prev) => {
      if (prev.some((p) => p.socketId === newParticipant.socketId)) {
        return prev
      }

      const nextId = Math.max(...prev.map((p) => p.id || 0)) + 1
      return [
        ...prev,
        {
          ...newParticipant,
          id: nextId,
          name: newParticipant.name || "User",
          isSelf: false,
          avatar: "/placeholder.svg?height=200&width=200",
          isMuted: newParticipant.isMuted || false,
          isVideoOff: newParticipant.isVideoOff || false,
        },
      ]
    })

    // Initiate connection with the new participant if we have a stream
    if (stream && socket) {
      // Force reconnection to the new peer
      socket.emit("request-connection", {
        targetSocketId: newParticipant.socketId,
        meetingId,
      })
    }
  }

  const getParticipantCountString = () => {
    const count = participants.length
    return `${count} ${count === 1 ? "participant" : "participants"}`
  }

  // Initialize socket event listeners
  useEffect(() => {
    if (!socket) return

    console.log("Setting up socket event listeners")

    // Set connected state
    setIsConnected(true)

    // Handle participant updated
    const handleParticipantUpdated = (updatedParticipant: Participant) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === updatedParticipant.socketId ? { ...p, ...updatedParticipant } : p)),
      )
    }

    // Handle participant leaving
    const handleParticipantLeft = (participantSocketId: string) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== participantSocketId))
    }

    // Handle new messages
    const handleNewMessage = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message])
    }

    // Handle media state updates
    const handleMediaStateUpdated = (update: { socketId: string; isMuted: boolean; isVideoOff: boolean }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.socketId === update.socketId ? { ...p, isMuted: update.isMuted, isVideoOff: update.isVideoOff } : p,
        ),
      )
    }

    // Add event listeners
    socket.on("participants-list", handleParticipantsList)
    socket.on("participant-updated", handleParticipantUpdated)
    socket.on("participant-joined", handleParticipantJoined)
    socket.on("participant-left", handleParticipantLeft)
    socket.on("new-message", handleNewMessage)
    socket.on("media-state-updated", handleMediaStateUpdated)

    // Initialize with self as first participant
    setParticipants([
      {
        id: 1,
        name: userName || "You",
        avatar: "/placeholder.svg?height=200&width=200",
        isSelf: true,
        isMuted,
        isVideoOff,
        socketId: socket.id,
      },
    ])

    // Cleanup function to remove event listeners
    return () => {
      console.log("Cleaning up socket event listeners")
      socket.off("participants-list", handleParticipantsList)
      socket.off("participant-updated", handleParticipantUpdated)
      socket.off("participant-joined", handleParticipantJoined)
      socket.off("participant-left", handleParticipantLeft)
      socket.off("new-message", handleNewMessage)
      socket.off("media-state-updated", handleMediaStateUpdated)
    }
  }, [socket, userName, isMuted, isVideoOff])

  // Add this useEffect to ensure peer connections are updated when participants change
  useEffect(() => {
    if (socket && stream && participants.length > 1) {
      // Check if we need to establish connections with any participants
      participants.forEach((participant) => {
        if (!participant.isSelf && participant.socketId && !peerStreams[participant.socketId]) {
          console.log("Requesting connection with participant:", participant.socketId)
          socket.emit("request-connection", {
            targetSocketId: participant.socketId,
            meetingId,
          })
        }
      })
    }
  }, [participants, socket, stream, peerStreams, meetingId])

  const toggleMute = (): void => {
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted
      })
    }
    setIsMuted(!isMuted)

    // Notify peers about media state change immediately
    if (socket && isConnected) {
      const newIsMuted = !isMuted
      socket.emit("media-state-change", {
        socketId: socket.id,
        isMuted: newIsMuted,
        isVideoOff,
      })

      // Update local participant state
      setParticipants((prev) => prev.map((p) => (p.isSelf ? { ...p, isMuted: newIsMuted } : p)))
    }
  }

  const toggleVideo = async (): Promise<void> => {
    const newIsVideoOff = !isVideoOff

    if (stream && stream.getVideoTracks().length > 0) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !newIsVideoOff
      })
    }

    setIsVideoOff(newIsVideoOff)

    // Notify peers about media state change immediately
    if (socket && isConnected) {
      socket.emit("media-state-change", {
        socketId: socket.id,
        isMuted,
        isVideoOff: newIsVideoOff,
      })

      // Update local participant state
      setParticipants((prev) => prev.map((p) => (p.isSelf ? { ...p, isVideoOff: newIsVideoOff } : p)))
    }

    // If we're turning video back on, we may need to renegotiate connections
    if (!newIsVideoOff && socket) {
      // Force reconnection to all peers
      socket.emit("renegotiate-connections", { meetingId })
    }
  }

  const toggleScreenShare = async (): Promise<void> => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        })

        // Replace video track with screen sharing track
        if (stream) {
          const videoTrack = stream.getVideoTracks()[0]
          if (videoTrack) {
            stream.removeTrack(videoTrack)
            videoTrack.stop()
          }

          const screenTrack = screenStream.getVideoTracks()[0]
          stream.addTrack(screenTrack)

          // Update peer connections with the new stream
          updatePeerStreams(stream)

          // Listen for the end of screen sharing
          screenTrack.onended = () => {
            toggleScreenShare()
          }
        }

        // Notify peers about screen sharing
        if (socket) {
          socket.emit("screen-share-started", { meetingId })
        }
      } else {
        // Stop screen sharing and revert to camera
        if (stream) {
          const screenTrack = stream.getVideoTracks()[0]
          if (screenTrack) {
            stream.removeTrack(screenTrack)
            screenTrack.stop()
          }

          // Re-enable camera
          const newCameraStream = await navigator.mediaDevices.getUserMedia({
            video: true,
          })
          const cameraTrack = newCameraStream.getVideoTracks()[0]
          stream.addTrack(cameraTrack)

          // Update peer connections with the new stream
          updatePeerStreams(stream)
        }

        // Notify peers about screen sharing ended
        if (socket) {
          socket.emit("screen-share-ended", { meetingId })
        }
      }

      setIsScreenSharing(!isScreenSharing)
    } catch (err) {
      console.error("Error during screen sharing:", err)
    }
  }

  const reconnectWithAllPeers = (): void => {
    if (socket && stream) {
      console.log("Reconnecting with all peers")
      socket.emit("renegotiate-connections", { meetingId })

      // Update peer connections with the current stream
      updatePeerStreams(stream)
    }
  }

  const sendMessage = (e: FormEvent): void => {
    e.preventDefault()
    if (!newMessage.trim() || !socket) return

    const newMsg: ChatMessage = {
      id: messages.length + 1,
      sender: userName,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      text: newMessage,
    }

    // Add message locally
    setMessages((prev) => [...prev, newMsg])

    // Send message through socket
    socket.emit("send-message", newMsg)

    // Clear input
    setNewMessage("")
  }

  const toggleFullScreen = (): void => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.log(`Error attempting to enable full-screen mode: ${err.message}`)
      })
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullScreen(!isFullScreen)
  }

  const endCall = (): void => {
    if (window.confirm("Are you sure you want to leave the meeting?")) {
      // Stop all media tracks before leaving
      stream?.getTracks().forEach((track) => track.stop())

      // Disconnect socket
      if (socket) {
        socket.disconnect()
      }

      window.location.href = "/"
    }
  }

  const getGridClass = (): string => {
    const count = participants.length
    if (count === 1) return "grid-cols-1"
    if (count === 2) return "grid-cols-1 md:grid-cols-2"
    if (count <= 4) return "grid-cols-1 sm:grid-cols-2"
    return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
  }

  // Show loading state while getting media permissions
  if (status === "loading" || isConnecting) {
    return (
      <div className="min-h-screen bg-[#202124] flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-lg mb-2">
            {status === "loading" ? "Requesting camera and microphone permissions..." : "Connecting to meeting..."}
          </p>
          <p className="text-sm text-gray-400">
            {status === "loading" ? "Please allow access when prompted" : "Establishing peer connections"}
          </p>
        </div>
      </div>
    )
  }

  // Show error state if media access failed
  if (status === "error" || connectionError) {
    return (
      <div className="min-h-screen bg-[#202124] flex items-center justify-center">
        <div className="text-white text-center max-w-md px-4">
          <p className="text-lg mb-2">
            {status === "error" ? "Unable to access camera or microphone" : "Connection error"}
          </p>
          <p className="text-sm text-gray-400 mb-4">{status === "error" ? error?.message : connectionError}</p>
          <Button onClick={() => window.location.reload()} variant="secondary">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#202124]">
      {/* Main content area */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 relative">
          <div className={`grid ${getGridClass()} gap-2 p-2 h-full`}>
            {participants.map((participant) => (
              <div
                key={participant.id || participant.socketId}
                className="relative bg-[#3c4043] rounded-lg overflow-hidden flex items-center justify-center"
              >
                {participant.isSelf ? (
                  participant.isVideoOff ? (
                    <div className="flex flex-col items-center justify-center">
                      <Avatar className="h-24 w-24 mb-2">
                        <AvatarImage src={participant.avatar} alt={participant.name} />
                        <AvatarFallback>{participant.name ? participant.name.charAt(0) : "U"}</AvatarFallback>
                      </Avatar>
                      <div className="text-white font-medium">{participant.name || "Unknown User"}</div>
                    </div>
                  ) : (
                    <VideoStream stream={stream} muted={true} className="w-full h-full object-cover" />
                  )
                ) : participant.isVideoOff ? (
                  <div className="flex flex-col items-center justify-center">
                    <Avatar className="h-24 w-24 mb-2">
                      <AvatarImage src={participant.avatar} alt={participant.name} />
                      <AvatarFallback>{participant.name ? participant.name.charAt(0) : "U"}</AvatarFallback>
                    </Avatar>
                    <div className="text-white font-medium">{participant.name || "Unknown User"}</div>
                  </div>
                ) : participant.socketId && peerStreams[participant.socketId] ? (
                  <VideoStream
                    stream={peerStreams[participant.socketId]}
                    muted={false}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <Avatar className="h-24 w-24 mb-2">
                      <AvatarImage
                        src={participant.avatar || "/placeholder.svg?height=200&width=200"}
                        alt={participant.name}
                      />
                      <AvatarFallback>{participant.name ? participant.name.charAt(0) : "U"}</AvatarFallback>
                    </Avatar>
                    <div className="text-white font-medium">{participant.name || "Unknown User"}</div>
                    <div className="text-xs text-gray-400 mt-1">Connecting...</div>
                  </div>
                )}
                {participant.isMuted && (
                  <div className="absolute top-2 right-2 bg-[#ea4335] rounded-full p-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white"
                    >
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
                  {participant.name} {participant.isSelf && "(You)"}
                </div>
              </div>
            ))}
          </div>

          {/* Meeting info overlay */}
          <div className="absolute top-2 left-2 bg-black/50 px-3 py-1.5 rounded-lg text-white text-sm flex items-center">
            <span className="mr-2">{meetingId}</span>
            <span>|</span>
            <span className="ml-2">{getParticipantCountString()}</span>
            <span>|</span>
            <span className="ml-2">
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Connection status indicator */}
          <div
            className={`absolute top-2 right-2 px-3 py-1.5 rounded-lg text-white text-sm ${
              isConnected ? "bg-green-500/50" : "bg-red-500/50"
            }`}
          >
            {isConnected ? "Connected" : "Connecting..."}
          </div>
        </div>

        {/* Side panel (desktop) */}
        {!isMobile && (showChat || showParticipants) && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <Tabs defaultValue="chat" className="flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="chat"
                  onClick={() => {
                    setShowChat(true)
                    setShowParticipants(false)
                  }}
                >
                  Chat
                </TabsTrigger>
                <TabsTrigger
                  value="participants"
                  onClick={() => {
                    setShowParticipants(true)
                    setShowChat(false)
                  }}
                >
                  {getParticipantCountString()}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 flex flex-col p-0 m-0">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-[#202124]">{message.sender}</span>
                          <span className="text-xs text-[#5f6368]">{message.time}</span>
                        </div>
                        <p className="text-sm text-[#3c4043]">{message.text}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t">
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Send a message to everyone"
                      className="flex-1 text-[#3c4043]"
                    />
                    <Button type="submit" size="sm" className="bg-[#1a73e8] hover:bg-[#1765cc] text-white">
                      Send
                    </Button>
                  </form>
                </div>
              </TabsContent>

              <TabsContent value="participants" className="flex-1 p-0 m-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {participants.map((participant) => (
                      <div key={participant.id || participant.socketId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage
                              src={participant.avatar || "/placeholder.svg?height=200&width=200"}
                              alt={participant.name}
                            />
                            <AvatarFallback>{participant.name ? participant.name.charAt(0) : "U"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-[#202124]">
                              {participant.name || "Unknown User"} {participant.isSelf && "(You)"}
                            </div>
                            {participant.isSelf && <div className="text-xs text-[#5f6368]">Meeting host</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {participant.isMuted && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-[#5f6368]"
                            >
                              <line x1="1" y1="1" x2="23" y2="23" />
                              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                              <line x1="12" y1="19" x2="12" y2="23" />
                              <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      {/* Controls */}
      <div className="bg-[#202124] p-4 flex items-center justify-center">
        <div className="flex items-center gap-2 sm:gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isMuted ? "destructive" : "secondary"}
                  size="icon"
                  className={`rounded-full h-10 w-10 sm:h-12 sm:w-12 ${
                    isMuted
                      ? "bg-[#ea4335] hover:bg-[#ea4335]/90 text-white"
                      : "bg-[#3c4043] hover:bg-[#5f6368] text-white"
                  }`}
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                      <line x1="8" y1="22" x2="16" y2="22" />
                    </svg>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isMuted ? "Unmute" : "Mute"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isVideoOff ? "destructive" : "secondary"}
                  size="icon"
                  className={`rounded-full h-10 w-10 sm:h-12 sm:w-12 ${
                    isVideoOff
                      ? "bg-[#ea4335] hover:bg-[#ea4335]/90 text-white"
                      : "bg-[#3c4043] hover:bg-[#5f6368] text-white"
                  }`}
                  onClick={toggleVideo}
                >
                  {isVideoOff ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14v-4z" />
                      <rect x="1" y="6" width="15" height="12" rx="2" ry="2" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14v-4z" />
                      <rect x="1" y="6" width="15" height="12" rx="2" ry="2" />
                    </svg>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isVideoOff ? "Turn on camera" : "Turn off camera"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isScreenSharing ? "destructive" : "secondary"}
                  size="icon"
                  className={`rounded-full h-10 w-10 sm:h-12 sm:w-12 ${
                    isScreenSharing
                      ? "bg-[#ea4335] hover:bg-[#ea4335]/90 text-white"
                      : "bg-[#3c4043] hover:bg-[#5f6368] text-white"
                  }`}
                  onClick={toggleScreenShare}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isScreenSharing ? "Stop presenting" : "Present now"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {isMobile ? (
            <Drawer>
              <DrawerTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-[#3c4043] hover:bg-[#5f6368] text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <Tabs defaultValue="chat" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                    <TabsTrigger value="participants">{getParticipantCountString()}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="chat" className="mt-4 px-4">
                    <ScrollArea className="h-[50vh]">
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div key={message.id} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-[#202124]">{message.sender}</span>
                              <span className="text-xs text-[#5f6368]">{message.time}</span>
                            </div>
                            <p className="text-sm text-[#3c4043]">{message.text}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="pt-4">
                      <form onSubmit={sendMessage} className="flex gap-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Send a message to everyone"
                          className="flex-1 text-[#3c4043]"
                        />
                        <Button type="submit" size="sm" className="bg-[#1a73e8] hover:bg-[#1765cc] text-white">
                          Send
                        </Button>
                      </form>
                    </div>
                  </TabsContent>

                  <TabsContent value="participants" className="mt-4 px-4">
                    <ScrollArea className="h-[50vh]">
                      <div className="space-y-4">
                        {participants.map((participant) => (
                          <div
                            key={participant.id || participant.socketId}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage
                                  src={participant.avatar || "/placeholder.svg?height=200&width=200"}
                                  alt={participant.name}
                                />
                                <AvatarFallback>{participant.name ? participant.name.charAt(0) : "U"}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-[#202124]">
                                  {participant.name || "Unknown User"} {participant.isSelf && "(You)"}
                                </div>
                                {participant.isSelf && <div className="text-xs text-[#5f6368]">Meeting host</div>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {participant.isMuted && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="text-[#5f6368]"
                                >
                                  <line x1="1" y1="1" x2="23" y2="23" />
                                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                                  <line x1="12" y1="19" x2="12" y2="23" />
                                  <line x1="8" y1="23" x2="16" y2="23" />
                                </svg>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </DrawerContent>
            </Drawer>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-[#3c4043] hover:bg-[#5f6368] text-white"
                    onClick={() => {
                      setShowChat(!showChat)
                      setShowParticipants(false)
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Chat</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {!isMobile && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-[#3c4043] hover:bg-[#5f6368] text-white"
                    onClick={() => {
                      setShowParticipants(!showParticipants)
                      setShowChat(false)
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Participants</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-[#3c4043] hover:bg-[#5f6368] text-white"
                  onClick={toggleFullScreen}
                >
                  {isFullScreen ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFullScreen ? "Exit full screen" : "Full screen"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-[#3c4043] hover:bg-[#5f6368] text-white"
                  onClick={reconnectWithAllPeers}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                  </svg>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reconnect</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="destructive"
            size="icon"
            className="rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-[#ea4335] hover:bg-[#ea4335]/90 text-white"
            onClick={endCall}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
              <line x1="23" y1="1" x2="1" y2="23" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  )
}

