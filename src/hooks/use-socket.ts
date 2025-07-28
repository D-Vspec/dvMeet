"use client"

import { useEffect, useState } from "react"
import { io, type Socket } from "socket.io-client"

const SOCKET_SERVER_URL = "http://ec2-15-206-149-187.ap-south-1.compute.amazonaws.com:3001"

export function useSocket(roomId: string, userName: string): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    // Create a new socket connection
    const newSocket = io(SOCKET_SERVER_URL, {
      query: {
        roomId,
        userName,
      },
      transports: ["websocket"],
      autoConnect: true,
    })

    // Set the socket in state
    setSocket(newSocket)

    // Set up event listeners
    newSocket.on("connect", () => {
      console.log("Socket connected with ID:", newSocket.id)

      // Join the room
      newSocket.emit("join-room", {
        roomId,
        userName,
        socketId: newSocket.id,
      })
    })

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error)
    })

    // Clean up on unmount
    return () => {
      if (newSocket) {
        console.log("Disconnecting socket")
        newSocket.disconnect()
      }
    }
  }, [roomId, userName])

  return socket
}

