const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

app.get("/", (req, res) => {
  res.send("WebSocket server is running.")
})

// Store active rooms and their participants
const rooms = new Map()

io.on("connection", (socket) => {
  const { roomId, userName } = socket.handshake.query

  console.log(`User connected: ${userName} (${socket.id}) to room ${roomId}`)

  // Handle joining a room
  socket.on("join-room", ({ roomId, userName, socketId }) => {
    // Join the socket.io room
    socket.join(roomId)

    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map())
    }

    // Add user to the room
    const room = rooms.get(roomId)
    room.set(socket.id, { socketId: socket.id, userName, isMuted: false, isVideoOff: false })

    // Notify other participants that a new user joined
    socket.to(roomId).emit("user-joined", { socketId: socket.id, userName })

    // Send current participants list to the new user
    const participants = Array.from(room.values())
    socket.emit("participants-list", participants)

    console.log(`${userName} joined room ${roomId}`)
  })

  // Handle getting users in a room
  socket.on("get-users", ({ roomId }) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId)
      const users = Array.from(room.values())
      socket.emit("room-users", users)
    } else {
      socket.emit("room-users", [])
    }
  })

  // Handle WebRTC signaling
  socket.on("offer", ({ roomId, targetId, sdp }) => {
    console.log(`Relaying offer from ${socket.id} to ${targetId}`)
    socket.to(targetId).emit("offer", { fromId: socket.id, sdp })
  })

  socket.on("answer", ({ roomId, targetId, sdp }) => {
    console.log(`Relaying answer from ${socket.id} to ${targetId}`)
    socket.to(targetId).emit("answer", { fromId: socket.id, sdp })
  })

  socket.on("ice-candidate", ({ roomId, targetId, candidate }) => {
    console.log(`Relaying ICE candidate from ${socket.id} to ${targetId}`)
    socket.to(targetId).emit("ice-candidate", { fromId: socket.id, candidate })
  })

  // Handle media state changes
  socket.on("media-state-change", ({ socketId, isMuted, isVideoOff }) => {
    if (!socketId) return

    // Find the room this user is in
    for (const [roomId, room] of rooms.entries()) {
      if (room.has(socketId)) {
        // Update user's media state
        const user = room.get(socketId)
        user.isMuted = isMuted
        user.isVideoOff = isVideoOff

        // Notify other participants about the state change
        socket.to(roomId).emit("media-state-updated", { socketId, isMuted, isVideoOff })
        break
      }
    }
  })

  // Handle screen sharing
  socket.on("screen-share-started", ({ meetingId }) => {
    socket.to(meetingId).emit("screen-share-started", { socketId: socket.id })
  })

  socket.on("screen-share-ended", ({ meetingId }) => {
    socket.to(meetingId).emit("screen-share-ended", { socketId: socket.id })
  })

  // Handle chat messages
  socket.on("send-message", (message) => {
    // Find the room this user is in
    for (const [roomId, room] of rooms.entries()) {
      if (room.has(socket.id)) {
        // Broadcast the message to all users in the room
        socket.to(roomId).emit("new-message", message)
        break
      }
    }
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`)

    // Find and remove user from their room
    for (const [roomId, room] of rooms.entries()) {
      if (room.has(socket.id)) {
        // Remove user from the room
        room.delete(socket.id)

        // Notify other participants that a user left
        socket.to(roomId).emit("user-left", socket.id)
        socket.to(roomId).emit("participant-left", socket.id)

        // If room is empty, delete it
        if (room.size === 0) {
          rooms.delete(roomId)
          console.log(`Room ${roomId} deleted (empty)`)
        }

        break
      }
    }
  })
})

const PORT = process.env.PORT || 8080
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
})

