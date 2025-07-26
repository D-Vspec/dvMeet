# P2P and TURN Server Architecture in dvMeet

## 📅 Last Updated: 2025-07-26 09:49:41 UTC
## 👤 Author: D-Vspec

A comprehensive guide to understanding the peer-to-peer (P2P) WebRTC implementation and TURN server architecture in dvMeet.

---

## 📋 Table of Contents

1. [High-Level Architecture Overview](#-high-level-architecture-overview)
2. [WebRTC Peer Connection Setup](#-webrtc-peer-connection-setup)
3. [Signaling Flow with Socket.IO](#-signaling-flow-with-socketio)
4. [Complete P2P Connection Establishment](#-complete-p2p-connection-establishment)
5. [ICE Candidate Processing & NAT Traversal](#-ice-candidate-processing--nat-traversal)
6. [NAT Traversal Scenarios](#-nat-traversal-scenarios)
7. [Advanced Features Implementation](#-advanced-features-implementation)
8. [Performance & Optimization](#-performance--optimization)
9. [Security Considerations](#-security-considerations)
10. [Troubleshooting Guide](#-troubleshooting-guide)

---

## 🏗️ High-Level Architecture Overview

dvMeet uses a **hybrid signaling + P2P architecture** that combines the best of both worlds:

- **Socket.IO Server** - Acts as the signaling server for WebRTC negotiation
- **WebRTC P2P Connections** - Direct peer-to-peer media streaming
- **STUN/TURN Servers** - NAT traversal and relay fallback

### Architecture Diagram

```
┌─────────────┐    Socket.IO     ┌─────────────────┐    Socket.IO     ┌─────────────┐
│   Client A  │◄────────────────►│  Signaling      │◄────────────────►│   Client B  │
│   (Browser) │                  │  Server         │                  │   (Browser) │
│             │                  │  (Node.js)      │                  │             │
└─────────────┘                  └─────────────────┘                  └─────────────┘
       │                                                                      │
       │                         WebRTC P2P Connection                        │
       │                         (Audio/Video/Data)                           │
       └──────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                              ┌─────────────────┐
                              │   STUN/TURN     │
                              │   Server        │
                              │ 35.238.50.228   │
                              │   Port: 3478    │
                              └─────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Protocol | Data Flow |
|-----------|---------------|----------|-----------|
| **Socket.IO Server** | Signaling, Room Management, Chat | WebSocket/HTTP | Control messages only |
| **WebRTC P2P** | Media streaming, Screen sharing | UDP/TCP | Audio, Video, Data channels |
| **STUN Server** | NAT discovery, Public IP detection | UDP | ICE candidates only |
| **TURN Server** | Media relay (fallback) | UDP/TCP | All media when P2P fails |

---

## 🔧 WebRTC Peer Connection Setup

### ICE Server Configuration

The foundation of WebRTC connectivity lies in proper ICE (Interactive Connectivity Establishment) server configuration:

```typescript
// File: src/hooks/use-peer-connections.tsx
const peerConnection = new RTCPeerConnection({
  iceServers: [
    { 
      urls: "stun:35.238.50.228:3478"     // STUN server for NAT discovery
    },
    { 
      urls: "turn:35.238.50.228:3478",   // TURN server for relay
      username: "test",
      credential: "testpassword"
    }
  ],
});
```

### STUN vs TURN Detailed Comparison

#### STUN Server (Session Traversal Utilities for NAT)

**Purpose**: Discovers your public IP address and determines NAT type

**How it works**:
1. Client sends a binding request to STUN server
2. STUN server responds with client's public IP and port
3. Client uses this information for ICE candidate generation
4. No media traffic passes through STUN server

**When it's used**:
- Both peers behind "cone" NATs (port-preserving)
- Symmetric routing is possible
- Firewalls allow UDP traffic

**Bandwidth Impact**: Minimal (only for discovery)

```typescript
// STUN process visualization
Client (192.168.1.100:5000) → NAT → Internet (203.0.113.1:12345) → STUN Server
                                                                  ←
Client receives: "Your public address is 203.0.113.1:12345"
```

#### TURN Server (Traversal Using Relays around NAT)

**Purpose**: Relays media traffic when direct P2P connection fails

**How it works**:
1. Client authenticates with TURN server using credentials
2. TURN server allocates a relay address for the client
3. All media traffic flows through TURN server
4. TURN server forwards packets between peers

**When it's used**:
- Symmetric NATs that change ports for each connection
- Enterprise firewalls blocking P2P traffic
- One or both peers behind strict NATs

**Bandwidth Impact**: High (all media traffic relayed)

```typescript
// TURN relay process
Client A → TURN Server → Client B
         ←             ←
// All audio/video packets flow through TURN server
```

### Connection Configuration Deep Dive

```typescript
// Complete peer connection setup
const createPeerConnection = (peerId: string, isInitiator: boolean) => {
  const peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:35.238.50.228:3478" },
      { 
        urls: "turn:35.238.50.228:3478",
        username: "test",
        credential: "testpassword"
      }
    ],
    // Additional configuration options
    iceCandidatePoolSize: 10,           // Pre-gather ICE candidates
    iceTransportPolicy: 'all',          // Use both STUN and TURN
    bundlePolicy: 'balanced',           // Media bundling strategy
    rtcpMuxPolicy: 'require'            // Multiplex RTP and RTCP
  });
  
  return peerConnection;
};
```

---

## 📡 Signaling Flow with Socket.IO

### Room Management Architecture

The signaling server maintains room state and coordinates WebRTC negotiation:

```javascript
// File: server.js - Room management
const rooms = new Map(); // roomId → Set of socketIds
const participants = new Map(); // socketId → participant data

socket.on("join-room", ({ roomId, userName }) => {
  // Create room if it doesn't exist
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  
  const room = rooms.get(roomId);
  room.set(socket.id, { 
    socketId: socket.id, 
    userName, 
    isMuted: false, 
    isVideoOff: false 
  });
  
  // Join Socket.IO room for broadcasting
  socket.join(roomId);
  
  // Notify existing participants
  socket.to(roomId).emit("user-joined", { 
    socketId: socket.id, 
    userName 
  });
  
  // Send current participants list to new user
  const participants = Array.from(room.values());
  socket.emit("participants-list", participants);
  
  console.log(`${userName} joined room ${roomId}`);
});
```

### WebRTC Signaling Message Types

The signaling server relays three critical WebRTC message types:

#### 1. Offer/Answer Exchange (SDP - Session Description Protocol)

**Offer Message**:
```javascript
// Server relays offer from initiator to target
socket.on("offer", ({ roomId, targetId, sdp }) => {
  console.log(`Relaying offer from ${socket.id} to ${targetId}`);
  socket.to(targetId).emit("offer", { 
    fromId: socket.id, 
    sdp 
  });
});
```

**Answer Message**:
```javascript
// Server relays answer from target back to initiator
socket.on("answer", ({ roomId, targetId, sdp }) => {
  console.log(`Relaying answer from ${socket.id} to ${targetId}`);
  socket.to(targetId).emit("answer", { 
    fromId: socket.id, 
    sdp 
  });
});
```

#### 2. ICE Candidate Exchange

```javascript
// Server relays ICE candidates between peers
socket.on("ice-candidate", ({ roomId, targetId, candidate }) => {
  console.log(`Relaying ICE candidate from ${socket.id} to ${targetId}`);
  socket.to(targetId).emit("ice-candidate", { 
    fromId: socket.id, 
    candidate 
  });
});
```

### Signaling Sequence Diagram

```
Client A                 Signaling Server                Client B
   │                           │                           │
   │────join-room────────────▶│                           │
   │                           │────user-joined─────────▶│
   │                           │                           │
   │                           │◄────join-room─────────────│
   │◄────user-joined───────────│                           │
   │                           │                           │
   │────offer─────────────────▶│                           │
   │                           │────offer─────────────────▶│
   │                           │                           │
   │                           │◄────answer────────────────│
   │◄────answer────────────────│                           │
   │                           │                           │
   │────ice-candidate─────────▶│                           │
   │                           │────ice-candidate─────────▶│
   │                           │                           │
   │                           │◄────ice-candidate─────────│
   │◄────ice-candidate─────────│                           │
   │                           │                           │
   │═══════════════════ Direct P2P Connection ═══════════════════│
```

---

## 🔄 Complete P2P Connection Establishment

### Phase 1: Initial Setup and Media Preparation

```typescript
// File: src/hooks/use-peer-connections.tsx
const createPeerConnection = (peerId: string, isInitiator: boolean) => {
  try {
    // 1. Create peer connection with ICE servers
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
    
    // 2. Store peer connection reference
    peerConnectionsRef.current[peerId] = peerConnection;
    
    // 3. Add local media tracks to connection
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
    
    // 4. Set up event handlers
    setupPeerConnectionEventHandlers(peerConnection, peerId);
    
    return peerConnection;
  } catch (err) {
    console.error("Error creating peer connection:", err);
    setConnectionError("Failed to create peer connection");
    return null;
  }
};
```

### Phase 2: Event Handler Setup

```typescript
const setupPeerConnectionEventHandlers = (peerConnection, peerId) => {
  // Handle ICE candidate generation
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        roomId,
        targetId: peerId,
        candidate: event.candidate,
      });
    }
  };
  
  // Handle incoming media tracks
  peerConnection.ontrack = (event) => {
    console.log("Received remote track from", peerId);
    
    const remoteStream = new MediaStream();
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
    
    setPeerStreams((prev) => ({
      ...prev,
      [peerId]: remoteStream,
    }));
  };
  
  // Monitor connection state changes
  peerConnection.onconnectionstatechange = () => {
    console.log(`Connection state with ${peerId}: ${peerConnection.connectionState}`);
    
    if (peerConnection.connectionState === "connected") {
      processPendingIceCandidates(peerId, peerConnection);
    }
  };
  
  // Monitor ICE connection state
  peerConnection.oniceconnectionstatechange = () => {
    console.log(`ICE connection state with ${peerId}: ${peerConnection.iceConnectionState}`);
    
    if (peerConnection.iceConnectionState === "failed" || 
        peerConnection.iceConnectionState === "closed") {
      closePeerConnection(peerId);
    }
  };
};
```

### Phase 3: Offer Creation and Exchange

```typescript
// Initiator creates and sends offer
if (isInitiator) {
  peerConnection.createOffer()
    .then((offer) => {
      console.log("Created offer for", peerId);
      return peerConnection.setLocalDescription(offer);
    })
    .then(() => {
      socket.emit("offer", {
        roomId,
        targetId: peerId,
        sdp: peerConnection.localDescription,
      });
      console.log("Sent offer to", peerId);
    })
    .catch((err) => {
      console.error("Error creating offer:", err);
      setConnectionError("Failed to create connection offer");
    });
}
```

### Phase 4: Answer Processing

```typescript
const handleOffer = async ({ fromId, sdp }) => {
  console.log(`Received offer from ${fromId}`);
  
  let peerConnection = peerConnectionsRef.current[fromId];
  if (!peerConnection) {
    peerConnection = createPeerConnection(fromId, false);
    if (!peerConnection) return;
  }
  
  try {
    // Set remote description from offer
    await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    
    // Process any queued ICE candidates
    processPendingIceCandidates(fromId, peerConnection);
    
    // Create and set local description (answer)
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    // Send answer back to initiator
    socket.emit("answer", {
      roomId,
      targetId: fromId,
      sdp: peerConnection.localDescription,
    });
    
    console.log("Sent answer to", fromId);
  } catch (err) {
    console.error(`Error handling offer from ${fromId}:`, err);
    setConnectionError(`Failed to process offer from ${fromId}`);
  }
};
```

### Phase 5: Answer Handling

```typescript
const handleAnswer = async ({ fromId, sdp }) => {
  console.log(`Received answer from ${fromId}`);
  
  const peerConnection = peerConnectionsRef.current[fromId];
  if (peerConnection) {
    try {
      // Validate signaling state before setting remote description
      if (peerConnection.signalingState === "stable" || 
          peerConnection.signalingState === "closed") {
        console.warn(`Unexpected signaling state ${peerConnection.signalingState}. Skipping answer.`);
        return;
      }
      
      // Set remote description from answer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      
      // Process any queued ICE candidates
      processPendingIceCandidates(fromId, peerConnection);
      
      console.log("Successfully processed answer from", fromId);
    } catch (err) {
      console.error(`Error setting remote description for ${fromId}:`, err);
      setConnectionError(`Failed to establish connection with ${fromId}`);
    }
  }
};
```

---

## 🔀 ICE Candidate Processing & NAT Traversal

### ICE Gathering Process Explained

ICE (Interactive Connectivity Establishment) gathers multiple types of candidates:

1. **Host Candidates**: Direct IP addresses of the device
2. **Server Reflexive Candidates**: Public IP addresses discovered via STUN
3. **Relay Candidates**: TURN server addresses for fallback

### Candidate Processing with Timing Handling

```typescript
// Advanced ICE candidate processing with queuing
const processPendingIceCandidates = (peerId: string, peerConnection: RTCPeerConnection) => {
  const pendingCandidates = pendingIceCandidatesRef.current[peerId] || [];
  
  pendingCandidates.forEach((candidate, index) => {
    try {
      // Only add candidate if connection is in valid state
      if (peerConnection.remoteDescription &&
          peerConnection.signalingState !== "closed" &&
          peerConnection.iceConnectionState !== "failed") {
        
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
```

### ICE Candidate Handler with Queuing

```typescript
const handleIceCandidate = ({ fromId, candidate }) => {
  console.log(`Received ICE candidate from ${fromId}`);
  
  const peerConnection = peerConnectionsRef.current[fromId];
  
  // Initialize pending candidates queue if needed
  if (!pendingIceCandidatesRef.current[fromId]) {
    pendingIceCandidatesRef.current[fromId] = [];
  }
  
  // Queue candidate if no peer connection exists
  if (!peerConnection) {
    pendingIceCandidatesRef.current[fromId].push(candidate);
    console.warn(`No peer connection for ${fromId}. Queuing ICE candidate.`);
    return;
  }
  
  // Queue candidate if remote description not set
  if (!peerConnection.remoteDescription) {
    pendingIceCandidatesRef.current[fromId].push(candidate);
    console.warn(`No remote description for ${fromId}. Queuing ICE candidate.`);
    return;
  }
  
  // Attempt to add ICE candidate immediately
  try {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      .then(() => {
        console.log(`Successfully added ICE candidate for ${fromId}`);
      })
      .catch((err) => {
        console.error(`Error adding ICE candidate for ${fromId}:`, err);
        // Queue for retry if adding fails
        pendingIceCandidatesRef.current[fromId].push(candidate);
      });
  } catch (err) {
    console.error(`Unexpected error processing ICE candidate for ${fromId}:`, err);
    pendingIceCandidatesRef.current[fromId].push(candidate);
  }
};
```

### Connection State Monitoring

```typescript
// Comprehensive connection state tracking
peerConnection.oniceconnectionstatechange = () => {
  const state = peerConnection.iceConnectionState;
  console.log(`ICE connection state with ${peerId}: ${state}`);
  
  switch (state) {
    case "checking":
      console.log("ICE candidates are being checked...");
      break;
    case "connected":
      console.log("ICE connection established successfully");
      processPendingIceCandidates(peerId, peerConnection);
      break;
    case "completed":
      console.log("ICE connection fully established");
      break;
    case "failed":
      console.warn("ICE connection failed, cleaning up");
      closePeerConnection(peerId);
      break;
    case "disconnected":
      console.warn("ICE connection temporarily disconnected");
      // Could implement reconnection logic here
      break;
    case "closed":
      console.log("ICE connection closed");
      closePeerConnection(peerId);
      break;
  }
};
```

---

## 🌐 NAT Traversal Scenarios

### Scenario 1: Direct P2P Connection (Optimal)

**Network Setup**:
```
Client A (Behind Cone NAT) ←→ Internet ←→ Client B (Behind Cone NAT)
```

**Process**:
1. Both clients contact STUN server to discover public IPs
2. STUN server responds with public IP and port mappings
3. Clients exchange ICE candidates through signaling server
4. Direct UDP connection established between public IPs
5. Media flows directly between clients

**Media Path**: `Client A ↔ Client B` (direct)

**Bandwidth Usage**: Minimal (only signaling through server)

**Latency**: Lowest possible (direct connection)

```typescript
// Example ICE candidates for direct connection
{
  candidate: "candidate:1 1 UDP 2130706431 192.168.1.100 54400 typ host",
  sdpMLineIndex: 0,
  sdpMid: "0"
}
{
  candidate: "candidate:2 1 UDP 1694498815 203.0.113.1 54400 typ srflx raddr 192.168.1.100 rport 54400",
  sdpMLineIndex: 0,
  sdpMid: "0"
}
```

### Scenario 2: TURN Relay Fallback (Necessary)

**Network Setup**:
```
Client A (Symmetric NAT) ←→ TURN Server ←→ Client B (Symmetric NAT)
```

**Process**:
1. Clients attempt direct connection but fail due to NAT restrictions
2. Clients authenticate with TURN server using credentials
3. TURN server allocates relay addresses for each client
4. All media traffic flows through TURN server
5. TURN server forwards packets between clients

**Media Path**: `Client A ↔ TURN Server ↔ Client B` (relayed)

**Bandwidth Usage**: High (all media relayed through server)

**Latency**: Higher due to relay hop

```typescript
// Example TURN relay candidate
{
  candidate: "candidate:3 1 UDP 16777215 35.238.50.228 49152 typ relay raddr 203.0.113.1 rport 54400",
  sdpMLineIndex: 0,
  sdpMid: "0"
}
```

### NAT Type Detection and Handling

```typescript
// Connection preferences based on candidate types
const analyzeCandidates = (candidates) => {
  const hostCandidates = candidates.filter(c => c.candidate.includes('typ host'));
  const srflxCandidates = candidates.filter(c => c.candidate.includes('typ srflx'));
  const relayCandidates = candidates.filter(c => c.candidate.includes('typ relay'));
  
  console.log(`Gathered candidates: ${hostCandidates.length} host, ${srflxCandidates.length} srflx, ${relayCandidates.length} relay`);
  
  // Preference order: host > srflx > relay
  if (srflxCandidates.length > 0) {
    console.log("Direct P2P connection likely possible");
  } else if (relayCandidates.length > 0) {
    console.log("TURN relay will be used");
  } else {
    console.warn("Limited connectivity options available");
  }
};
```

### Connection Quality Monitoring

```typescript
// Monitor connection statistics
const monitorConnectionQuality = (peerConnection) => {
  setInterval(async () => {
    try {
      const stats = await peerConnection.getStats();
      
      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          console.log('Active connection:', {
            localCandidate: report.localCandidateId,
            remoteCandidate: report.remoteCandidateId,
            bytesReceived: report.bytesReceived,
            bytesSent: report.bytesSent,
            currentRoundTripTime: report.currentRoundTripTime
          });
        }
      });
    } catch (err) {
      console.error('Error getting connection stats:', err);
    }
  }, 5000);
};
```

---

## 🎯 Advanced Features Implementation

### Screen Sharing with Track Replacement

```typescript
// File: src/app/meeting/[id]/page.tsx
const toggleScreenShare = async (): Promise<void> => {
  try {
    if (!isScreenSharing) {
      // Start screen sharing
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { max: 1920 },
          height: { max: 1080 },
          frameRate: { max: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // Replace video track in existing stream
      if (stream) {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          stream.removeTrack(videoTrack);
          videoTrack.stop();
        }

        const screenTrack = screenStream.getVideoTracks()[0];
        stream.addTrack(screenTrack);

        // Update all peer connections with new stream
        updatePeerStreams(stream);

        // Handle screen share end event
        screenTrack.onended = () => {
          console.log("Screen sharing ended by user or system");
          toggleScreenShare();
        };
      }

      // Notify other participants
      if (socket) {
        socket.emit("screen-share-started", { 
          meetingId,
          userName,
          timestamp: Date.now()
        });
      }

    } else {
      // Stop screen sharing and revert to camera
      if (stream) {
        const screenTrack = stream.getVideoTracks()[0];
        if (screenTrack) {
          stream.removeTrack(screenTrack);
          screenTrack.stop();
        }

        // Re-enable camera
        const newCameraStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        });
        
        const cameraTrack = newCameraStream.getVideoTracks()[0];
        stream.addTrack(cameraTrack);

        // Update peer connections
        updatePeerStreams(stream);
      }

      // Notify participants that screen sharing ended
      if (socket) {
        socket.emit("screen-share-ended", { 
          meetingId,
          userName,
          timestamp: Date.now()
        });
      }
    }

    setIsScreenSharing(!isScreenSharing);
  } catch (err) {
    console.error("Error during screen sharing:", err);
    
    // Handle specific errors
    if (err.name === 'NotAllowedError') {
      console.error("Screen sharing permission denied");
    } else if (err.name === 'NotSupportedError') {
      console.error("Screen sharing not supported");
    }
  }
};
```

### Dynamic Media Stream Updates

```typescript
// File: src/hooks/use-peer-connections.tsx
const updatePeerStreams = (newStream: MediaStream) => {
  localStreamRef.current = newStream;

  Object.keys(peerConnectionsRef.current).forEach((peerId) => {
    const peerConnection = peerConnectionsRef.current[peerId];

    // Get current senders
    const senders = peerConnection.getSenders();
    
    // Remove old tracks
    senders.forEach((sender) => {
      if (sender.track) {
        peerConnection.removeTrack(sender);
      }
    });

    // Add new tracks
    newStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, newStream);
    });
    
    console.log(`Updated stream for peer ${peerId}`);
  });
};
```

### Real-time Chat Implementation

```typescript
// Chat message handling with Socket.IO
const sendMessage = (e: FormEvent): void => {
  e.preventDefault();
  if (!newMessage.trim() || !socket) return;

  const newMsg: ChatMessage = {
    id: Date.now(),
    sender: userName,
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    text: newMessage,
    timestamp: Date.now()
  };

  // Add message locally for immediate feedback
  setMessages((prev) => [...prev, newMsg]);

  // Send message through socket to other participants
  socket.emit("send-message", {
    roomId: meetingId,
    message: newMsg
  });

  // Clear input
  setNewMessage("");
};

// Handle incoming messages
socket.on("new-message", (message: ChatMessage) => {
  setMessages((prev) => [...prev, message]);
  
  // Show notification if chat panel is closed
  if (!showChat) {
    setHasUnreadMessages(true);
  }
});
```

### Participant State Synchronization

```typescript
// Real-time media state updates
useEffect(() => {
  if (socket && isConnected) {
    // Emit media state changes to server
    socket.emit("media-state-change", {
      socketId: socket.id,
      isMuted,
      isVideoOff,
      timestamp: Date.now()
    });

    // Update local participant state
    setParticipants((prev) => 
      prev.map((p) => 
        p.isSelf ? { ...p, isMuted, isVideoOff } : p
      )
    );
  }
}, [isMuted, isVideoOff, socket, isConnected]);

// Handle participant media state updates from server
socket.on("media-state-updated", (update: MediaStateUpdate) => {
  setParticipants((prev) =>
    prev.map((p) =>
      p.socketId === update.socketId 
        ? { ...p, isMuted: update.isMuted, isVideoOff: update.isVideoOff }
        : p
    )
  );
});
```

---

## ⚡ Performance & Optimization

### Mesh Topology Analysis

dvMeet uses a **mesh topology** where each client connects directly to every other client:

```
    Client A
   /   |   \
  /    |    \
Client B ─ ─ ─ Client C
  \    |    /
   \   |   /
    Client D
```

**Advantages**:
- Lowest possible latency (direct connections)
- No single point of failure
- Distributed bandwidth usage
- Real-time communication without relay delays

**Scaling Characteristics**:
- **Connections**: O(n²) - Each client maintains (n-1) connections
- **Upload Bandwidth**: O(n) per client - Each client uploads to (n-1) peers
- **Download Bandwidth**: O(n) per client - Each client receives from (n-1) peers

**Practical Limits**:
```typescript
// Bandwidth calculation for different participant counts
const calculateBandwidth = (participants, videoBitrate = 1000) => { // 1 Mbps per stream
  const connections = participants - 1;
  const uploadKbps = connections * videoBitrate;
  const downloadKbps = connections * videoBitrate;
  
  return {
    participants,
    connections: participants * (participants - 1) / 2, // Total connections in mesh
    uploadPerClient: uploadKbps,
    downloadPerClient: downloadKbps,
    totalBandwidth: participants * uploadKbps
  };
};

console.log(calculateBandwidth(4));  // 4 participants
// Output: { participants: 4, connections: 6, uploadPerClient: 3000, downloadPerClient: 3000, totalBandwidth: 12000 }
```

### Resource Management Strategies

#### Connection Cleanup

```typescript
// Proper peer connection cleanup
const closePeerConnection = (peerId: string) => {
  const peerConnection = peerConnectionsRef.current[peerId];
  
  if (peerConnection) {
    // Stop all transceivers
    peerConnection.getTransceivers().forEach((transceiver) => {
      if (transceiver.sender && transceiver.sender.track) {
        transceiver.sender.track.stop();
      }
      transceiver.stop();
    });
    
    // Close the connection
    peerConnection.close();
    
    // Remove from tracking
    delete peerConnectionsRef.current[peerId];
    
    // Remove stream from state
    setPeerStreams((prev) => {
      const newStreams = { ...prev };
      delete newStreams[peerId];
      return newStreams;
    });
    
    // Clear pending ICE candidates
    delete pendingIceCandidatesRef.current[peerId];
    
    console.log(`Cleaned up peer connection for ${peerId}`);
  }
};
```

#### Memory Management

```typescript
// Component cleanup on unmount
useEffect(() => {
  return () => {
    // Stop all media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
    }
    
    // Close all peer connections
    Object.keys(peerConnectionsRef.current).forEach((peerId) => {
      closePeerConnection(peerId);
    });
    
    // Disconnect socket
    if (socket) {
      socket.disconnect();
    }
    
    console.log("Meeting component cleanup completed");
  };
}, []);
```

### Adaptive Quality Management

```typescript
// Dynamic video quality adjustment based on connection count
const adjustVideoQuality = (participantCount: number) => {
  let constraints;
  
  if (participantCount <= 2) {
    // High quality for 1-on-1
    constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      }
    };
  } else if (participantCount <= 4) {
    // Medium quality for small groups
    constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 24 }
      }
    };
  } else {
    // Lower quality for larger groups
    constraints = {
      video: {
        width: { ideal: 320 },
        height: { ideal: 240 },
        frameRate: { ideal: 15 }
      }
    };
  }
  
  return constraints;
};
```

---

## 🔒 Security Considerations

### WebRTC Built-in Security

**DTLS Encryption**:
- All WebRTC media is encrypted by default using DTLS (Datagram Transport Layer Security)
- Provides end-to-end encryption for audio, video, and data channels
- Keys are negotiated during the connection establishment phase

**SRTP (Secure Real-time Transport Protocol)**:
- Encrypts media packets in transit
- Provides authentication and integrity verification
- Prevents eavesdropping and tampering

```typescript
// Security is handled automatically by WebRTC
const peerConnection = new RTCPeerConnection(/* config */);
// All media streams are automatically encrypted with DTLS/SRTP
```

### TURN Server Authentication

```typescript
// Secure TURN server configuration
const iceServers = [
  { urls: "stun:35.238.50.228:3478" },
  { 
    urls: "turn:35.238.50.228:3478",
    username: "test",                    // Should be time-limited token
    credential: "testpassword"           // Should be generated dynamically
  }
];

// Production security improvements:
// 1. Use time-limited credentials
// 2. Generate credentials server-side
// 3. Rotate credentials regularly
// 4. Use TURN over TLS (turns://)
```

### Socket.IO Security

```typescript
// Server-side CORS and origin validation
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true
});

// Connection validation
io.use((socket, next) => {
  const origin = socket.handshake.headers.origin;
  
  if (isAllowedOrigin(origin)) {
    next();
  } else {
    next(new Error('Origin not allowed'));
  }
});
```

### Privacy Protection

**No Server-side Media Storage**:
- All media streams are peer-to-peer
- No recording or storage on signaling server
- Temporary relay through TURN server only when necessary

**Data Minimization**:
```typescript
// Only essential data is stored on server
const participantData = {
  socketId: socket.id,
  userName: sanitize(userName),    // Sanitize user input
  isMuted: false,
  isVideoOff: false
  // No sensitive information stored
};
```

---

## 🔧 Troubleshooting Guide

### Common Connection Issues

#### 1. ICE Connection Failed

**Symptoms**:
- Peers can join the room but no audio/video
- Console shows "ICE connection state: failed"

**Diagnosis**:
```typescript
// Add detailed ICE logging
peerConnection.oniceconnectionstatechange = () => {
  console.log(`ICE State: ${peerConnection.iceConnectionState}`);
  
  if (peerConnection.iceConnectionState === 'failed') {
    // Log gathered candidates for analysis
    peerConnection.getStats().then(stats => {
      stats.forEach(report => {
        if (report.type === 'local-candidate') {
          console.log('Local candidate:', report);
        }
        if (report.type === 'remote-candidate') {
          console.log('Remote candidate:', report);
        }
      });
    });
  }
};
```

**Solutions**:
1. Verify STUN/TURN server accessibility
2. Check firewall settings for UDP traffic
3. Ensure TURN credentials are valid
4. Test with TURN-only configuration

#### 2. Media Tracks Not Received

**Symptoms**:
- Connection established but video/audio missing
- `ontrack` event not firing

**Diagnosis**:
```typescript
// Verify track sending
peerConnection.getSenders().forEach((sender, index) => {
  console.log(`Sender ${index}:`, {
    track: sender.track,
    trackKind: sender.track?.kind,
    trackEnabled: sender.track?.enabled
  });
});

// Check for track receiving
peerConnection.ontrack = (event) => {
  console.log('Track received:', {
    kind: event.track.kind,
    id: event.track.id,
    streams: event.streams.length
  });
};
```

**Solutions**:
1. Ensure tracks are added before creating offer
2. Verify getUserMedia permissions
3. Check track enable/disable state

#### 3. Socket.IO Connection Issues

**Symptoms**:
- Cannot join rooms
- Signaling messages not delivered

**Diagnosis**:
```typescript
socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});
```

**Solutions**:
1. Verify server is running and accessible
2. Check CORS configuration
3. Ensure WebSocket transport is available

### Debug Tools and Monitoring

#### Connection Statistics

```typescript
// Comprehensive connection monitoring
const monitorConnection = async (peerConnection, peerId) => {
  try {
    const stats = await peerConnection.getStats();
    
    stats.forEach((report) => {
      switch (report.type) {
        case 'inbound-rtp':
          if (report.mediaType === 'video') {
            console.log(`Video received from ${peerId}:`, {
              framesReceived: report.framesReceived,
              bytesReceived: report.bytesReceived,
              jitter: report.jitter
            });
          }
          break;
          
        case 'outbound-rtp':
          if (report.mediaType === 'video') {
            console.log(`Video sent to ${peerId}:`, {
              framesSent: report.framesSent,
              bytesSent: report.bytesSent,
              qualityLimitationReason: report.qualityLimitationReason
            });
          }
          break;
          
        case 'candidate-pair':
          if (report.state === 'succeeded') {
            console.log(`Active connection to ${peerId}:`, {
              localAddress: report.localCandidateId,
              remoteAddress: report.remoteCandidateId,
              currentRoundTripTime: report.currentRoundTripTime,
              availableOutgoingBitrate: report.availableOutgoingBitrate
            });
          }
          break;
      }
    });
  } catch (err) {
    console.error(`Error getting stats for ${peerId}:`, err);
  }
};

// Run monitoring every 5 seconds
setInterval(() => {
  Object.keys(peerConnectionsRef.current).forEach(peerId => {
    monitorConnection(peerConnectionsRef.current[peerId], peerId);
  });
}, 5000);
```

#### Browser Compatibility Checks

```typescript
// Check WebRTC support
const checkWebRTCSupport = () => {
  const isSupported = {
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    RTCPeerConnection: !!window.RTCPeerConnection,
    getDisplayMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)
  };
  
  console.log('WebRTC Support:', isSupported);
  
  if (!isSupported.RTCPeerConnection) {
    throw new Error('WebRTC not supported in this browser');
  }
  
  return isSupported;
};
```

### Performance Optimization Tips

1. **Limit Participant Count**: Consider switching to SFU architecture for >6 participants
2. **Adaptive Bitrate**: Implement quality scaling based on network conditions
3. **Connection Pooling**: Reuse peer connections when possible
4. **Efficient Cleanup**: Always clean up resources properly
5. **Error Recovery**: Implement automatic reconnection for failed connections

---

## 📚 Additional Resources

### WebRTC Documentation
- [WebRTC.org](https://webrtc.org/) - Official WebRTC documentation
- [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) - Browser API reference
- [RFC 5245 (ICE)](https://tools.ietf.org/html/rfc5245) - ICE specification

### Socket.IO Resources
- [Socket.IO Documentation](https://socket.io/docs/) - Official Socket.IO guide
- [Socket.IO Client API](https://socket.io/docs/v4/client-api/) - Client-side API reference

### STUN/TURN Servers
- [CoTURN](https://github.com/coturn/coturn) - Open source TURN server
- [Google STUN Servers](https://gist.github.com/mondain/b0ec1cf5f60ae726202e) - Public STUN servers

---

**Last Updated**: 2025-07-26 09:49:41 UTC  
**Author**: D-Vspec  
**Repository**: [dvMeet](https://github.com/D-Vspec/dvMeet)

---

*This documentation provides a comprehensive understanding of the P2P WebRTC implementation in dvMeet. For additional questions or contributions, please refer to the main repository.*
