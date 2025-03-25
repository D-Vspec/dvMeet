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

const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (res.socket.server.io) {
    res.end()
    return
  }

  const io = new Server(res.socket.server, {
    addTrailingSlash: false,
  })

  res.socket.server.io = io

  io.on("connection", (socket) => {
    const meetingId = socket.handshake.query.meetingId as string

    socket.join(meetingId)

    // Notify others when a new participant joins
    socket.to(meetingId).emit("participant-joined", {
      socketId: socket.id,
      name: socket.handshake.query.userName || "Anonymous",
      isMuted: false,
      isVideoOff: false,
    })

    // Send existing participants to the new joiner
    const roomSockets = io.sockets.adapter.rooms.get(meetingId)
    if (roomSockets) {
      const participants = []
      for (const socketId of roomSockets) {
        if (socketId !== socket.id) {
          const participantSocket = io.sockets.sockets.get(socketId)
          if (participantSocket) {
            participants.push({
              socketId,
              name: participantSocket.handshake.query.userName || "Anonymous",
              isMuted: false,
              isVideoOff: false,
            })
          }
        }
      }
      socket.emit("participants-list", participants)
    }

    // Handle WebRTC signaling
    socket.on("signal", ({ signal, to }) => {
      socket.to(to).emit("signal", { signal, from: socket.id })
    })

    socket.on("participant-update", (participant) => {
      socket.to(meetingId).emit("participant-updated", participant)
    })

    socket.on("send-message", (message) => {
      socket.to(meetingId).emit("new-message", message)
    })

    socket.on("media-state-change", (state) => {
      socket.to(meetingId).emit("media-state-updated", state)
    })

    socket.on("screen-share-started", () => {
      socket.to(meetingId).emit("screen-share-started", { socketId: socket.id })
    })

    socket.on("screen-share-ended", () => {
      socket.to(meetingId).emit("screen-share-ended", { socketId: socket.id })
    })

    socket.on("disconnect", () => {
      socket.to(meetingId).emit("participant-left", socket.id)
      socket.leave(meetingId)
    })
  })

  res.end()
}

export default SocketHandler

