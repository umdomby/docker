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

    const cleanup = useCallback(() => {
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

    const startCall = useCallback(async () => {
        try {
            if (typeof window === 'undefined') return;
            cleanup(); // Очистка предыдущего соединения

            // Инициализация Signaling
            const signaling = new SignalingClient('wss://anybet.site/ws');
            signalingRef.current = signaling;

            // Инициализация PeerConnection
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            pcRef.current = pc;

            // Получение медиапотока
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            setLocalStream(stream);

            // Добавление треков в PeerConnection
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // Обработчики ICE кандидатов
            pc.onicecandidate = ({ candidate }) => {
                if (candidate && signalingRef.current) {
                    signalingRef.current.send({
                        event: 'ice-candidate',
                        data: candidate.toJSON(),
                        room: roomId
                    });
                }
            };

            // Обработчик входящих треков
            pc.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                    setIsConnected(true);
                }
            };

            // Подключение к signaling серверу
            await signaling.connect(roomId);

            // Создание и отправка offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            signaling.send({
                event: 'offer',
                data: offer,
                room: roomId
            });

            // Обработчики signaling сообщений
            signaling.on('answer', async (answer: RTCSessionDescriptionInit) => {
                if (pcRef.current) {
                    await pcRef.current.setRemoteDescription(answer);
                }
            });

            signaling.on('ice-candidate', async (candidate: RTCIceCandidateInit) => {
                if (pcRef.current) {
                    await pcRef.current.addIceCandidate(candidate);
                }
            });

            // Обработка ошибок
            signaling.on('error', (err: Error) => {
                setError(`Signaling error: ${err.message}`);
                console.error('Signaling error:', err);
            });

            pc.oniceconnectionstatechange = () => {
                if (pcRef.current?.iceConnectionState === 'disconnected') {
                    setError('Connection lost');
                    cleanup();
                }
            };

        } catch (err) {
            setError(err instanceof Error ? err.message : 'WebRTC setup failed');
            console.error('WebRTC error:', err);
            cleanup();
        }
    }, [roomId, cleanup]);

    const endCall = useCallback(() => {
        cleanup();
    }, [cleanup]);

    // Автоматическая очистка при размонтировании
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    return {
        localStream,
        remoteStream,
        isConnected,
        error,
        startCall,
        endCall
    };
};