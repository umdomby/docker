'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SignalingClient } from '../lib/signaling';

export const useWebRTC = (roomId: string) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const signalingRef = useRef<SignalingClient | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const setupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const resetConnection = useCallback(() => {
        console.log('[WebRTC] Resetting connection');
        setConnectionStatus('disconnecting');

        // Clear setup timeout
        if (setupTimeoutRef.current) {
            clearTimeout(setupTimeoutRef.current);
            setupTimeoutRef.current = null;
        }

        // Cleanup PeerConnection
        if (pcRef.current) {
            pcRef.current.onicecandidate = null;
            pcRef.current.oniceconnectionstatechange = null;
            pcRef.current.ontrack = null;
            pcRef.current.close();
            pcRef.current = null;
        }

        // Cleanup Signaling
        if (signalingRef.current) {
            signalingRef.current.close();
            signalingRef.current = null;
        }

        // Cleanup MediaStreams
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }

        if (remoteStreamRef.current) {
            remoteStreamRef.current.getTracks().forEach(track => track.stop());
            remoteStreamRef.current = null;
            setRemoteStream(null);
        }

        // Reset state
        setIsConnected(false);
        setIsLoading(false);
        setConnectionStatus('disconnected');
    }, [localStream]);

    const handleError = useCallback((error: string, originalError?: any) => {
        console.error('[WebRTC] Error:', error, originalError);
        setError(error);
        resetConnection();
    }, [resetConnection]);

    const initializePeerConnection = useCallback(() => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 10,
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
        });

        pc.oniceconnectionstatechange = () => {
            console.log('[WebRTC] ICE state:', pc.iceConnectionState);
            switch (pc.iceConnectionState) {
                case 'connected':
                    setConnectionStatus('connected');
                    break;
                case 'disconnected':
                case 'failed':
                    handleError(`ICE connection ${pc.iceConnectionState}`);
                    break;
            }
        };

        pc.onicecandidate = ({ candidate }) => {
            if (candidate && signalingRef.current) {
                signalingRef.current.send({
                    event: 'ice-candidate',
                    data: candidate.toJSON(),
                    room: roomId
                });
            }
        };

        pc.ontrack = (event) => {
            console.log('[WebRTC] Received remote track');
            if (!remoteStreamRef.current) {
                remoteStreamRef.current = new MediaStream();
                setRemoteStream(remoteStreamRef.current);
            }
            event.streams[0].getTracks().forEach(track => {
                remoteStreamRef.current?.addTrack(track);
            });
            setIsConnected(true);
            setIsLoading(false);
            setConnectionStatus('connected');
        };

        return pc;
    }, [roomId, handleError]);

    const startCall = useCallback(async () => {
        try {
            console.log('[WebRTC] Starting call');
            setError(null);
            setIsLoading(true);
            setConnectionStatus('connecting');
            resetConnection();

            // Initialize Signaling
            const signaling = new SignalingClient('wss://anybet.site/ws');
            signalingRef.current = signaling;

            signaling.on('error', (err) => {
                if (err.includes('timeout')) {
                    handleError('Connection timeout. Please check your network');
                } else {
                    handleError(`Connection error: ${err}`);
                }
            });

            // Set overall setup timeout (30 seconds)
            setupTimeoutRef.current = setTimeout(() => {
                handleError('Setup timeout. Please try again');
            }, 30000);

            // Connect to signaling server
            await signaling.connect(roomId);

            // Initialize PeerConnection
            pcRef.current = initializePeerConnection();

            // Get User Media
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                setLocalStream(stream);
                stream.getTracks().forEach(track => {
                    pcRef.current?.addTrack(track, stream);
                });
            } catch (err) {
                throw new Error('Could not access camera/microphone');
            }

            // Setup Signaling Handlers
            signaling.on('offer', async (offer: RTCSessionDescriptionInit) => {
                try {
                    if (!pcRef.current?.currentRemoteDescription) {
                        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(offer));
                        const answer = await pcRef.current?.createAnswer();
                        await pcRef.current?.setLocalDescription(answer);
                        signaling.send({
                            event: 'answer',
                            data: answer,
                            room: roomId
                        });
                    }
                } catch (err) {
                    handleError('Error handling offer', err);
                }
            });

            signaling.on('answer', async (answer: RTCSessionDescriptionInit) => {
                try {
                    await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
                } catch (err) {
                    handleError('Error handling answer', err);
                }
            });

            signaling.on('ice-candidate', async (candidate: RTCIceCandidateInit) => {
                try {
                    if (candidate.candidate) {
                        await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                } catch (err) {
                    console.error('[WebRTC] ICE candidate error:', err);
                }
            });

            // Create Initial Offer
            try {
                const offer = await pcRef.current?.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true
                });
                await pcRef.current?.setLocalDescription(offer);
                signaling.send({
                    event: 'offer',
                    data: offer,
                    room: roomId
                });
            } catch (err) {
                throw new Error('Error creating offer');
            }

            // Clear setup timeout if everything succeeded
            if (setupTimeoutRef.current) {
                clearTimeout(setupTimeoutRef.current);
                setupTimeoutRef.current = null;
            }

        } catch (err) {
            handleError(
                err instanceof Error ? err.message : 'WebRTC setup failed',
                err
            );
        }
    }, [roomId, resetConnection, handleError, initializePeerConnection]);

    const endCall = useCallback(() => {
        console.log('[WebRTC] Ending call');
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
        connectionStatus,
        startCall,
        endCall
    };
};