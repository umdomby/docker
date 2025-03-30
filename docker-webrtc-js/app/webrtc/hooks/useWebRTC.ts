'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SignalingClient } from '../lib/signaling';

export const useWebRTC = (roomId: string) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const signalingRef = useRef<SignalingClient | null>(null);

    const startCall = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            setLocalStream(stream);

            const signaling = new SignalingClient('wss://anybet.site/ws');
            signalingRef.current = signaling;

            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            pcRef.current = pc;

            // Add local stream tracks to peer connection
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // ICE candidate handler
            pc.onicecandidate = ({ candidate }) => {
                if (candidate) {
                    signaling.send({
                        event: 'ice-candidate',
                        data: candidate.toJSON(),
                        room: roomId
                    });
                }
            };

            // Track handler for remote stream
            pc.ontrack = (event) => {
                if (!remoteStream) {
                    const newRemoteStream = new MediaStream();
                    setRemoteStream(newRemoteStream);
                }
                event.streams[0].getTracks().forEach(track => {
                    remoteStream?.addTrack(track);
                });
                setIsConnected(true);
            };

            await signaling.connect(roomId);

            // Handle incoming offers
            signaling.on('offer', async (offer: RTCSessionDescriptionInit) => {
                if (!pc.remoteDescription) {
                    await pc.setRemoteDescription(offer);
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    signaling.send({
                        event: 'answer',
                        data: answer,
                        room: roomId
                    });
                }
            });

            // Handle incoming answers
            signaling.on('answer', async (answer: RTCSessionDescriptionInit) => {
                await pc.setRemoteDescription(answer);
            });

            // Handle ICE candidates
            signaling.on('ice-candidate', async (candidate: RTCIceCandidateInit) => {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error('Error adding ICE candidate:', err);
                }
            });

            // Create and send offer if we're the first in the room
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            signaling.send({
                event: 'offer',
                data: offer,
                room: roomId
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'WebRTC setup failed');
            console.error('WebRTC error:', err);
        }
    }, [roomId]);

    const endCall = useCallback(() => {
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (signalingRef.current) {
            signalingRef.current.close();
            signalingRef.current = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        setRemoteStream(null);
        setIsConnected(false);
    }, [localStream]);

    useEffect(() => {
        return () => {
            endCall();
        };
    }, [endCall]);

    return {
        localStream,
        remoteStream,
        isConnected,
        error,
        startCall,
        endCall
    };
};