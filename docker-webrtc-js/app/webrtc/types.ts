// app/webrtc/types.ts
export interface RoomCreatedData {
    roomId: string;
    clients: string[];
}

export interface WebRTCOffer {
    offer: RTCSessionDescriptionInit;
    from: string;
}

export interface WebRTCAnswer {
    answer: RTCSessionDescriptionInit;
    from: string;
}

export interface WebRTCCandidate {
    candidate: RTCIceCandidateInit;
    from: string;
}

export interface User {
    username: string;
    stream?: MediaStream;
    peerConnection?: RTCPeerConnection;
}

export interface SignalingClientOptions {
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
    connectionTimeout?: number;
}