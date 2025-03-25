"use client"

import { useState, useEffect, useRef } from "react"
import type { Socket } from "socket.io-client"

// Interfaces for room and user-related data
interface UserData {
  socketId: string;
  userName: string;
}

interface PeerConnectionsResult {
  peerStreams: Record<string, MediaStream>
  updatePeerStreams: (stream: MediaStream) => void
  isConnecting: boolean
  connectionError: string | null
}

export function usePeerConnections(
  socket: Socket | null,
  localStream: MediaStream | null,
  roomId: string,
): PeerConnectionsResult {
  const [peerStreams, setPeerStreams] = useState<Record<string, MediaStream>>({})
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Use refs to store peer connections and streams to avoid recreating on each render
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({})
  const localStreamRef = useRef<MediaStream | null>(null)

  // Update local stream ref when it changes
  useEffect(() => {
    localStreamRef.current = localStream
  }, [localStream])

  // Initialize WebRTC when socket and local stream are available
  useEffect(() => {
    if (!socket || !localStream) return

    setIsConnecting(true)

    // Function to create a new peer connection
    const createPeerConnection = (peerId: string, isInitiator: boolean) => {
      try {
        // Check if peer connection already exists
        if (peerConnectionsRef.current[peerId]) {
          console.log(`Peer connection with ${peerId} already exists`)
          return peerConnectionsRef.current[peerId]
        }

        // Create new RTCPeerConnection with STUN/TURN servers
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
          ],
        })

        // Store the peer connection
        peerConnectionsRef.current[peerId] = peerConnection

        // Remove existing tracks before adding new ones
        peerConnection.getSenders().forEach((sender) => {
          peerConnection.removeTrack(sender)
        })

        // Add local tracks to the peer connection
        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream)
        })

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", {
              roomId,
              targetId: peerId,
              candidate: event.candidate,
            })
          }
        }

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          console.log(`Connection state with ${peerId}:`, peerConnection.connectionState)
        }

        // Handle ICE connection state changes
        peerConnection.oniceconnectionstatechange = () => {
          console.log(`ICE connection state with ${peerId}:`, peerConnection.iceConnectionState)

          // Clean up if connection failed or closed
          if (peerConnection.iceConnectionState === "failed" || peerConnection.iceConnectionState === "closed") {
            closePeerConnection(peerId)
          }
        }

        // Handle remote tracks
        peerConnection.ontrack = (event) => {
          console.log("Received remote track from", peerId)

          // Create a new stream from the received tracks
          const remoteStream = new MediaStream()
          event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
          })

          // Update peer streams
          setPeerStreams((prev) => ({
            ...prev,
            [peerId]: remoteStream,
          }))
        }

        // If initiator, create and send offer
        if (isInitiator) {
          peerConnection
            .createOffer()
            .then((offer) => peerConnection.setLocalDescription(offer))
            .then(() => {
              socket.emit("offer", {
                roomId,
                targetId: peerId,
                sdp: peerConnection.localDescription,
              })
            })
            .catch((err) => {
              console.error("Error creating offer:", err)
              setConnectionError("Failed to create connection offer")
            })
        }

        return peerConnection
      } catch (err) {
        console.error("Error creating peer connection:", err)
        setConnectionError("Failed to create peer connection")
        return null
      }
    }

    // Function to close a peer connection
    const closePeerConnection = (peerId: string) => {
      if (peerConnectionsRef.current[peerId]) {
        peerConnectionsRef.current[peerId].close()
        delete peerConnectionsRef.current[peerId]

        // Remove the stream from state
        setPeerStreams((prev) => {
          const newStreams = { ...prev }
          delete newStreams[peerId]
          return newStreams
        })
      }
    }

    // Handle socket events for WebRTC signaling
    const handleUserJoined = ({ socketId, userName }: UserData) => {
      console.log(`User joined: ${userName} (${socketId})`)
      // Ensure a peer connection is created for the new user
      const existingPeerConnection = peerConnectionsRef.current[socketId]
      if (!existingPeerConnection) {
        createPeerConnection(socketId, true)
      }
    }

    const handleUserLeft = (socketId: string) => {
      console.log(`User left: ${socketId}`)
      closePeerConnection(socketId)
    }

    const handleOffer = ({ fromId, sdp }: { fromId: string; sdp: RTCSessionDescriptionInit }) => {
      console.log(`Received offer from ${fromId}`)

      // Create peer connection if it doesn't exist
      let peerConnection = peerConnectionsRef.current[fromId]
      if (!peerConnection) {
        peerConnection = createPeerConnection(fromId, false)!
        if (!peerConnection) return
      }

      // Set remote description and create answer
      peerConnection
        .setRemoteDescription(new RTCSessionDescription(sdp))
        .then(() => peerConnection.createAnswer())
        .then((answer) => peerConnection.setLocalDescription(answer))
        .then(() => {
          socket.emit("answer", {
            roomId,
            targetId: fromId,
            sdp: peerConnection.localDescription,
          })
        })
        .catch((err) => {
          console.error("Error handling offer:", err)
          setConnectionError("Failed to handle connection offer")
        })
    }

    const handleAnswer = ({ fromId, sdp }: { fromId: string; sdp: RTCSessionDescriptionInit }) => {
      console.log(`Received answer from ${fromId}`)
      const peerConnection = peerConnectionsRef.current[fromId]
      if (peerConnection) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(sdp)).catch((err) => {
          console.error("Error setting remote description:", err)
          setConnectionError("Failed to establish connection")
        })
      }
    }

    const handleIceCandidate = ({ fromId, candidate }: { fromId: string; candidate: RTCIceCandidateInit }) => {
      console.log(`Received ICE candidate from ${fromId}`)
      const peerConnection = peerConnectionsRef.current[fromId]
      if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
          console.error("Error adding ICE candidate:", err)
        })
      }
    }

    const handleRoomUsers = (users: UserData[]) => {
      console.log("Users in room:", users)

      users.forEach((user) => {
        if (user.socketId !== socket.id) {
          const existingPeerConnection = peerConnectionsRef.current[user.socketId]
          if (!existingPeerConnection) {
            createPeerConnection(user.socketId, true)
          }
        }
      })

      setIsConnecting(false)
    }

    socket.on("user-joined", handleUserJoined)
    socket.on("user-left", handleUserLeft)
    socket.on("offer", handleOffer)
    socket.on("answer", handleAnswer)
    socket.on("ice-candidate", handleIceCandidate)
    socket.on("room-users", handleRoomUsers)
    socket.emit("get-users", { roomId })

    return () => {
      Object.keys(peerConnectionsRef.current).forEach((peerId) => {
        closePeerConnection(peerId)
      })

      socket.off("user-joined", handleUserJoined)
      socket.off("user-left", handleUserLeft)
      socket.off("offer", handleOffer)
      socket.off("answer", handleAnswer)
      socket.off("ice-candidate", handleIceCandidate)
      socket.off("room-users", handleRoomUsers)
    }
  }, [socket, localStream, roomId])

  const updatePeerStreams = (newStream: MediaStream) => {
    localStreamRef.current = newStream

    Object.keys(peerConnectionsRef.current).forEach((peerId) => {
      const peerConnection = peerConnectionsRef.current[peerId]
      
      peerConnection.getSenders().forEach((sender) => {
        peerConnection.removeTrack(sender)
      })

      newStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, newStream)
      })
    })
  }

  return {
    peerStreams,
    updatePeerStreams,
    isConnecting,
    connectionError,
  }
}