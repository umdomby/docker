'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SignalingClient } from '../lib/signaling';

export const useWebRTC = (roomId: string) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const signalingRef = useRef<SignalingClient | null>(null);

    const resetConnection = useCallback(() => {
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
        setIsLoading(false);
    }, [localStream]);

    const startCall = useCallback(async () => {
        try {
            setError(null);
            setIsLoading(true);
            resetConnection();

            // Initialize signaling with error handling
            const signaling = new SignalingClient('wss://anybet.site/ws');
            signalingRef.current = signaling;

            signaling.on('error', (err) => {
                setError(`Signaling error: ${err}`);
                console.error('Signaling error:', err);
                resetConnection();
            });

            // Initialize peer connection
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' }
                ],
                iceCandidatePoolSize: 10
            });
            pcRef.current = pc;

            // Get user media with error handling
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                setLocalStream(stream);

                // Add tracks to connection
                stream.getTracks().forEach(track => {
                    pc.addTrack(track, stream);
                });
            } catch (err) {
                setError('Could not access camera/microphone');
                throw err;
            }

            // ICE Candidate handling
            pc.onicecandidate = ({ candidate }) => {
                if (candidate) {
                    signaling.send({
                        event: 'ice-candidate',
                        data: candidate.toJSON(),
                        room: roomId
                    });
                }
            };

            // Remote stream handling
            pc.ontrack = (event) => {
                if (!remoteStream) {
                    const newStream = new MediaStream();
                    setRemoteStream(newStream);
                }
                event.streams[0].getTracks().forEach(track => {
                    remoteStream?.addTrack(track);
                });
                setIsConnected(true);
                setIsLoading(false);
            };

            // Connect to signaling server
            await signaling.connect(roomId);

            // Message handlers
            signaling.on('offer', async (offer: RTCSessionDescriptionInit) => {
                if (!pc.currentRemoteDescription) {
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    signaling.send({
                        event: 'answer',
                        data: answer,
                        room: roomId
                    });
                }
            });

            signaling.on('answer', async (answer: RTCSessionDescriptionInit) => {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            });

            signaling.on('ice-candidate', async (candidate: RTCIceCandidateInit) => {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error('ICE candidate error:', err);
                }
            });

            // Create initial offer
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await pc.setLocalDescription(offer);
            signaling.send({
                event: 'offer',
                data: offer,
                room: roomId
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'WebRTC setup failed');
            console.error('WebRTC error:', err);
            resetConnection();
        }
    }, [roomId, resetConnection]);

    const endCall = useCallback(() => {
        resetConnection();
    }, [resetConnection]);

    useEffect(() => {
        return () => {
            endCall();
        };
    }, [endCall]);

    return {
        localStream,
        remoteStream,
        isConnected,
        isLoading,
        error,
        startCall,
        endCall
    };
};