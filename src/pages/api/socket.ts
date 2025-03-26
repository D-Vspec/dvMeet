import { Server } from "socket.io"
import type { Server as HTTPServer } from "http"
import type { NextApiRequest, NextApiResponse } from "next"
import type { Socket as NetSocket } from "net"

interface SocketServer extends HTTPServer {
  io?: Server
}

interface SocketWithIO extends NetSocket {
  server: SocketServer
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO
}

interface Participant {
  socketId: string
  userName: string
  isMuted: boolean
  isVideoOff: boolean
}

const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (res.socket.server.io) {
    res.end()
    return
  }

  const io = new Server(res.socket.server, {
    path: "/api/socket",
    addTrailingSlash: false,
  })

  res.socket.server.io = io

  const rooms = new Map<string, Set<string>>()
  const participants = new Map<string, Participant>()

  io.on("connection", (socket) => {
    const roomId = socket.handshake.query.roomId as string
    const userName = socket.handshake.query.userName as string

    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set())
    }

    // Add participant to room
    rooms.get(roomId)?.add(socket.id)
    participants.set(socket.id, {
      socketId: socket.id,
      userName,
      isMuted: false,
      isVideoOff: false,
    })

    // Join room
    socket.join(roomId)

    // Notify others about new participant
    socket.to(roomId).emit("participant-joined", participants.get(socket.id))

    // Handle get participants request
    socket.on("get-participants", () => {
      const roomParticipants = Array.from(rooms.get(roomId) || [])
        .map(id => participants.get(id))
        .filter(p => p && p.socketId !== socket.id)
      socket.emit("participants-list", roomParticipants)
    })

    // Handle WebRTC signaling
    socket.on("offer", ({ targetId, sdp }) => {
      socket.to(targetId).emit("offer", {
        fromId: socket.id,
        sdp,
      })
    })

    socket.on("answer", ({ targetId, sdp }) => {
      socket.to(targetId).emit("answer", {
        fromId: socket.id,
        sdp,
      })
    })

    socket.on("ice-candidate", ({ targetId, candidate }) => {
      socket.to(targetId).emit("ice-candidate", {
        fromId: socket.id,
        candidate,
      })
    })

    // Handle participant updates
    socket.on("update-media-state", (state) => {
      const participant = participants.get(socket.id)
      if (participant) {
        participants.set(socket.id, { ...participant, ...state })
        socket.to(roomId).emit("participant-updated", participants.get(socket.id))
      }
    })

    // Handle disconnect
    socket.on("disconnect", () => {
      rooms.get(roomId)?.delete(socket.id)
      participants.delete(socket.id)
      socket.to(roomId).emit("participant-left", socket.id)

      // Clean up empty room
      if (rooms.get(roomId)?.size === 0) {
        rooms.delete(roomId)
      }
    })
  })

  res.end()
}

export default SocketHandler