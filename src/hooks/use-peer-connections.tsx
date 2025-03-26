"use client";

import { useState, useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";

// Interfaces for room and user-related data
interface UserData {
  socketId: string;
  userName: string;
}

interface PeerConnectionsResult {
  peerStreams: Record<string, MediaStream>;
  updatePeerStreams: (stream: MediaStream) => void;
  isConnecting: boolean;
  connectionError: string | null;
}

export function usePeerConnections(
  socket: Socket | null,
  localStream: MediaStream | null,
  roomId: string
): PeerConnectionsResult {
  const [peerStreams, setPeerStreams] = useState<Record<string, MediaStream>>(
    {}
  );
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Use refs to store peer connections and streams to avoid recreating on each render
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingIceCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});

  // Update local stream ref when it changes
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Improved ICE candidate processing function
  const processPendingIceCandidates = (peerId: string, peerConnection: RTCPeerConnection) => {
    const pendingCandidates = pendingIceCandidatesRef.current[peerId] || [];
    
    pendingCandidates.forEach((candidate, index) => {
      try {
        // Only add candidate if remote description is set and connection is in a valid state
        if (
          peerConnection.remoteDescription &&
          peerConnection.signalingState !== "closed" &&
          peerConnection.iceConnectionState !== "failed"
        ) {
          peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            .then(() => {
              console.log(`Successfully added ICE candidate ${index} for peer ${peerId}`);
            })
            .catch((err) => {
              console.warn(`Failed to add ICE candidate ${index} for peer ${peerId}:`, err);
            });
        } else {
          console.warn(`Cannot process ICE candidate for ${peerId}. Invalid connection state.`);
        }
      } catch (err) {
        console.error(`Error processing ICE candidate for ${peerId}:`, err);
      }
    });

    // Clear processed candidates
    delete pendingIceCandidatesRef.current[peerId];
  };

  // Initialize WebRTC when socket and local stream are available
  useEffect(() => {
    if (!socket || !localStream) return;

    setIsConnecting(true);

    // Function to create a new peer connection
    const createPeerConnection = (peerId: string, isInitiator: boolean) => {
      try {
        // Check if peer connection already exists
        if (peerConnectionsRef.current[peerId]) {
          console.log(`Peer connection with ${peerId} already exists`);
          return peerConnectionsRef.current[peerId];
        }

        // Create new RTCPeerConnection with STUN/TURN servers
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:35.238.50.228:3478" },
            { 
              urls: "turn:35.238.50.228:3478",
              username: "test",
              credential: "testpassword"
            }
          ],
        });

        // Store the peer connection
        peerConnectionsRef.current[peerId] = peerConnection;

        // Remove existing tracks before adding new ones
        peerConnection.getSenders().forEach((sender) => {
          peerConnection.removeTrack(sender);
        });

        // Add local tracks to the peer connection
        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
        });

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", {
              roomId,
              targetId: peerId,
              candidate: event.candidate,
            });
          }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          console.log(
            `Connection state with ${peerId}: ${peerConnection.connectionState}`
          );
          console.log(`Signaling state: ${peerConnection.signalingState}`);

          // Attempt to process pending candidates when connection state changes
          if (peerConnection.connectionState === "connected") {
            processPendingIceCandidates(peerId, peerConnection);
          }
        };

        // Handle ICE connection state changes
        peerConnection.oniceconnectionstatechange = () => {
          console.log(
            `ICE connection state with ${peerId}:`,
            peerConnection.iceConnectionState
          );

          // Clean up if connection failed or closed
          if (
            peerConnection.iceConnectionState === "failed" ||
            peerConnection.iceConnectionState === "closed"
          ) {
            closePeerConnection(peerId);
          }

          // Attempt to process pending candidates
          if (peerConnection.iceConnectionState === "connected") {
            processPendingIceCandidates(peerId, peerConnection);
          }
        };

        // Handle remote tracks
        peerConnection.ontrack = (event) => {
          console.log("Received remote track from", peerId);

          // Create a new stream from the received tracks
          const remoteStream = new MediaStream();
          event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
          });

          // Update peer streams
          setPeerStreams((prev) => ({
            ...prev,
            [peerId]: remoteStream,
          }));
        };

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
              });
            })
            .catch((err) => {
              console.error("Error creating offer:", err);
              setConnectionError("Failed to create connection offer");
            });
        }

        return peerConnection;
      } catch (err) {
        console.error("Error creating peer connection:", err);
        setConnectionError("Failed to create peer connection");
        return null;
      }
    };

    // Function to close a peer connection
    const closePeerConnection = (peerId: string) => {
      if (peerConnectionsRef.current[peerId]) {
        peerConnectionsRef.current[peerId].close();
        delete peerConnectionsRef.current[peerId];

        // Remove the stream from state
        setPeerStreams((prev) => {
          const newStreams = { ...prev };
          delete newStreams[peerId];
          return newStreams;
        });

        // Clear any pending ICE candidates
        delete pendingIceCandidatesRef.current[peerId];
      }
    };

    // Socket event handlers
    const handleUserJoined = ({ socketId, userName }: UserData) => {
      console.log(`User joined: ${userName} (${socketId})`);
      // Ensure a peer connection is created for the new user
      if (!peerConnectionsRef.current[socketId]) {
        console.log(
          `Creating new peer connection for ${userName} (${socketId})`
        );
        createPeerConnection(socketId, true);
      }
    };

    const handleUserLeft = (socketId: string) => {
      console.log(`User left: ${socketId}`);
      closePeerConnection(socketId);
    };

    const handleOffer = async ({
      fromId,
      sdp,
    }: {
      fromId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      console.log(`Received offer from ${fromId}`);

      let peerConnection = peerConnectionsRef.current[fromId];
      if (!peerConnection) {
        peerConnection = createPeerConnection(fromId, false)!;
        if (!peerConnection) return;
      }

      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));

        // Process any queued ICE candidates
        processPendingIceCandidates(fromId, peerConnection);

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit("answer", {
          roomId,
          targetId: fromId,
          sdp: peerConnection.localDescription,
        });
      } catch (err) {
        console.error(`Error handling offer from ${fromId}:`, err);
        setConnectionError(`Failed to process offer from ${fromId}`);
      }
    };

    const handleAnswer = async ({
      fromId,
      sdp,
    }: {
      fromId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      console.log(`Received answer from ${fromId}`);

      const peerConnection = peerConnectionsRef.current[fromId];
      if (peerConnection) {
        try {
          // Additional state validation before setting remote description
          if (
            peerConnection.signalingState === "stable" ||
            peerConnection.signalingState === "closed"
          ) {
            console.warn(
              `Unexpected signaling state ${peerConnection.signalingState}. Skipping answer.`
            );
            return;
          }

          await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));

          // Process any queued ICE candidates
          processPendingIceCandidates(fromId, peerConnection);
        } catch (err) {
          console.error(`Error setting remote description for ${fromId}:`, err);
          setConnectionError(`Failed to establish connection with ${fromId}`);
        }
      }
    };

    const handleIceCandidate = ({
      fromId,
      candidate,
    }: {
      fromId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      console.log(`Received ICE candidate from ${fromId}`);

      const peerConnection = peerConnectionsRef.current[fromId];
      
      // If no peer connection exists, create pending candidates queue
      if (!pendingIceCandidatesRef.current[fromId]) {
        pendingIceCandidatesRef.current[fromId] = [];
      }

      // If no peer connection, queue the candidate
      if (!peerConnection) {
        pendingIceCandidatesRef.current[fromId].push(candidate);
        console.warn(`No peer connection for ${fromId}. Queuing ICE candidate.`);
        return;
      }

      // If remote description is not set, queue the candidate
      if (!peerConnection.remoteDescription) {
        pendingIceCandidatesRef.current[fromId].push(candidate);
        console.warn(`No remote description for ${fromId}. Queuing ICE candidate.`);
        return;
      }

      // Attempt to add ICE candidate
      try {
        peerConnection
          .addIceCandidate(new RTCIceCandidate(candidate))
          .catch((err) => {
            console.error(`Error adding ICE candidate for ${fromId}:`, err);
            // If adding fails, queue the candidate for potential retry
            pendingIceCandidatesRef.current[fromId].push(candidate);
          });
      } catch (err) {
        console.error(`Unexpected error processing ICE candidate for ${fromId}:`, err);
        pendingIceCandidatesRef.current[fromId].push(candidate);
      }
    };

    const handleRoomUsers = (users: UserData[]) => {
      console.log("Users in room:", users);

      users.forEach((user) => {
        if (user.socketId !== socket.id) {
          if (!peerConnectionsRef.current[user.socketId]) {
            createPeerConnection(user.socketId, true);
          }
        }
      });

      setIsConnecting(false);
    };

    // Socket event listeners
    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("room-users", handleRoomUsers);
    socket.emit("get-users", { roomId });

    // Cleanup function
    return () => {
      Object.keys(peerConnectionsRef.current).forEach((peerId) => {
        closePeerConnection(peerId);
      });

      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("room-users", handleRoomUsers);
    };
  }, [socket, localStream, roomId]);

  const updatePeerStreams = (newStream: MediaStream) => {
    localStreamRef.current = newStream;

    Object.keys(peerConnectionsRef.current).forEach((peerId) => {
      const peerConnection = peerConnectionsRef.current[peerId];

      peerConnection.getSenders().forEach((sender) => {
        peerConnection.removeTrack(sender);
      });

      newStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, newStream);
      });
    });
  };

  return {
    peerStreams,
    updatePeerStreams,
    isConnecting,
    connectionError,
  };
}