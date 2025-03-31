//useWebRTC.ts
import { useEffect, useRef, useState } from 'react';
import { SignalingClient } from '../lib/signaling';

export const useWebRTC = (deviceIds: { video: string; audio: string }) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [isCaller, setIsCaller] = useState(false);
    const [iceStatus, setIceStatus] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [error, setError] = useState<string | null>(null);

    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const signalingClient = useRef<SignalingClient | null>(null);
    const remoteStreamRef = useRef<MediaStream>(new MediaStream());
    const localStreamRef = useRef<MediaStream | null>(null);

    // Инициализация PeerConnection
    const initPeerConnection = () => {
        try {
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    // { urls: 'stun.voipbuster.com' },
                    // { urls: 'stun.stunprotocol.org' },
                    // {
                    //     urls: "turn:192.168.0.151:3478",
                    //     username: "username1",
                    //     credential: "password1"
                    // }
                ],
                iceTransportPolicy: 'all',
                iceCandidatePoolSize: 10,
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require'
            });

            pc.onicecandidate = (event) => {
                if (event.candidate && signalingClient.current) {
                    signalingClient.current.sendCandidate(event.candidate.toJSON());
                }
            };

            pc.oniceconnectionstatechange = () => {
                const state = pc.iceConnectionState;
                setIceStatus(state);
                console.log('ICE Connection State:', state);

                if (state === 'failed') {
                    restartIce();
                }
            };

            pc.onconnectionstatechange = () => {
                const state = pc.connectionState;
                setConnectionStatus(state);
                console.log('Connection State:', state);
            };

            pc.ontrack = (event) => {
                if (!event.streams || !event.streams[0]) return;

                for (const track of event.streams[0].getTracks()) {
                    if (!remoteStreamRef.current.getTracks().some(t => t.id === track.id)) {
                        remoteStreamRef.current.addTrack(track);
                    }
                }
                setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
            };

            peerConnection.current = pc;
            return pc;
        } catch (err) {
            console.error('Error initializing peer connection:', err);
            setError('Failed to initialize connection');
            throw err;
        }
    };

    // Перезапуск ICE
    const restartIce = () => {
        if (!peerConnection.current) return;

        try {
            peerConnection.current.restartIce();
            console.log('ICE restart triggered');
        } catch (err) {
            console.error('Error restarting ICE:', err);
        }
    };

    // Получение медиапотока
    const getLocalMedia = async () => {
        try {
            const constraints = {
                video: deviceIds.video ? {
                    deviceId: { exact: deviceIds.video },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } : true,
                audio: deviceIds.audio ? {
                    deviceId: { exact: deviceIds.audio },
                    echoCancellation: true,
                    noiseSuppression: true
                } : true
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStreamRef.current = stream;
            setLocalStream(stream);
            return stream;
        } catch (err) {
            console.error('Error getting media devices:', err);
            setError('Could not access camera/microphone');
            throw err;
        }
    };

    // Начало звонка
    const startCall = async (isInitiator: boolean, existingRoomId?: string) => {
        try {
            setIsCaller(isInitiator);
            initPeerConnection();
            const stream = await getLocalMedia();

            // Добавляем треки в соединение
            stream.getTracks().forEach(track => {
                peerConnection.current?.addTrack(track, stream);
            });

            // Инициализация клиента сигнализации
            signalingClient.current = new SignalingClient('wss://anybet.site/ws');

            // Настройка обработчиков событий
            signalingClient.current.onRoomCreated((id) => {
                setRoomId(id);
            });

            signalingClient.current.onOffer(async (offer) => {
                if (!peerConnection.current) return;

                await peerConnection.current.setRemoteDescription(offer);
                const answer = await peerConnection.current.createAnswer();
                await peerConnection.current.setLocalDescription(answer);
                signalingClient.current?.sendAnswer(answer);
            });

            signalingClient.current.onAnswer(async (answer) => {
                if (peerConnection.current) {
                    await peerConnection.current.setRemoteDescription(answer);
                }
            });

            signalingClient.current.onCandidate(async (candidate) => {
                if (peerConnection.current && candidate) {
                    try {
                        await peerConnection.current.addIceCandidate(
                            new RTCIceCandidate(candidate)
                        );
                    } catch (err) {
                        console.error('Error adding ICE candidate:', err);
                    }
                }
            });

            // Создание или присоединение к комнате
            if (isInitiator) {
                signalingClient.current.createRoom();
            } else if (existingRoomId) {
                signalingClient.current.joinRoom(existingRoomId);
            }

        } catch (err) {
            console.error('Error starting call:', err);
            setError('Failed to start call');
            cleanup();
            throw err;
        }
    };

    // Присоединение к существующей комнате
    const joinRoom = (roomId: string) => {
        setRoomId(roomId);
        startCall(false, roomId);
    };

    // Остановка звонка
    const stopCall = () => {
        cleanup();
        setRoomId(null);
        setConnectionStatus('disconnected');
    };

    // Очистка ресурсов
    const cleanup = () => {
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }

        if (signalingClient.current) {
            signalingClient.current.close();
            signalingClient.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
            setLocalStream(null);
        }

        if (remoteStreamRef.current) {
            remoteStreamRef.current.getTracks().forEach(track => track.stop());
            remoteStreamRef.current = new MediaStream();
            setRemoteStream(null);
        }
    };

    // Автоматическая очистка при размонтировании
    useEffect(() => {
        return cleanup;
    }, []);

    return {
        localStream,
        remoteStream,
        roomId,
        iceStatus,
        connectionStatus,
        error,
        isConnected: connectionStatus === 'connected',
        startCall,
        joinRoom,
        stopCall,
        restartIce
    };
};