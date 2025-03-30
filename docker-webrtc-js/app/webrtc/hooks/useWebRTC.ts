'use client';

import { useState, useEffect, useCallback } from 'react';
import { SignalingClient } from '../lib/signaling';

export const useWebRTC = (roomId: string) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startCall = useCallback(async () => {
        try {
            if (typeof window === 'undefined') return;

            const signaling = new SignalingClient('wss://anybet.site/ws');
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            setLocalStream(stream);

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = ({ candidate }) => {
                if (candidate) {
                    signaling.send({
                        event: 'ice-candidate',
                        data: candidate.toJSON(),
                        room: roomId
                    });
                }
            };

            pc.ontrack = (event) => {
                setRemoteStream(event.streams[0]);
                setIsConnected(true);
            };

            await signaling.connect(roomId);

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            signaling.send({
                event: 'offer',
                data: offer,
                room: roomId
            });

            signaling.on('answer', async (answer: RTCSessionDescriptionInit) => {
                await pc.setRemoteDescription(answer);
            });

            signaling.on('ice-candidate', async (candidate: RTCIceCandidateInit) => {
                await pc.addIceCandidate(candidate);
            });

            return () => {
                pc.close();
                signaling.close();
                stream.getTracks().forEach(track => track.stop());
            };

        } catch (err) {
            setError(err instanceof Error ? err.message : 'WebRTC setup failed');
            console.error('WebRTC error:', err);
        }
    }, [roomId]);

    const endCall = useCallback(() => {
        setLocalStream(prev => {
            prev?.getTracks().forEach(track => track.stop());
            return null;
        });
        setRemoteStream(null);
        setIsConnected(false);
    }, []);

    return {
        localStream,
        remoteStream,
        isConnected,
        error,
        startCall,
        endCall
    };
};