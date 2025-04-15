// file: docker-ardua/components/webrtc/hooks/useWebRTC.ts
import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
    type: string;
    data?: any;
    sdp?: RTCSessionDescriptionInit;
    ice?: RTCIceCandidateInit;
    room?: string;
    username?: string;
}

export const useWebRTC = (
    deviceIds: { video: string; audio: string },
    username: string,
    roomId: string
) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [users, setUsers] = useState<string[]>([]);
    const [isCallActive, setIsCallActive] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isInRoom, setIsInRoom] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const ws = useRef<WebSocket | null>(null);
    const pc = useRef<RTCPeerConnection | null>(null);
    const pendingIceCandidates = useRef<RTCIceCandidate[]>([]);
    const isNegotiating = useRef(false);
    const shouldCreateOffer = useRef(false);

    const cleanup = () => {
        if (pc.current) {
            pc.current.onicecandidate = null;
            pc.current.ontrack = null;
            pc.current.onnegotiationneeded = null;
            pc.current.oniceconnectionstatechange = null;
            pc.current.close();
            pc.current = null;
        }

        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }

        if (remoteStream) {
            remoteStream.getTracks().forEach(track => track.stop());
            setRemoteStream(null);
        }

        setIsCallActive(false);
        pendingIceCandidates.current = [];
        isNegotiating.current = false;
        shouldCreateOffer.current = false;
    };

    const leaveRoom = () => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'leave',
                room: roomId,
                username
            }));
        }
        cleanup();
        setUsers([]);
        setIsInRoom(false);
        ws.current?.close();
        ws.current = null;
    };

    const normalizeSdp = (sdp: string | undefined): string => {
        if (!sdp) return '';
        return sdp
            .split('\r\n')
            .filter(line => line.trim() !== '')
            .join('\r\n') + '\r\n';
    };

    const connectWebSocket = () => {
        try {
            ws.current = new WebSocket('wss://anybet.site/ws');

            ws.current.onopen = () => {
                setIsConnected(true);
                setError(null);
                console.log('WebSocket connected');

                if (shouldCreateOffer.current && pc.current) {
                    createAndSendOffer();
                }
            };

            ws.current.onerror = (event) => {
                console.error('WebSocket error:', event);
                setError('Ошибка подключения');
                setIsConnected(false);
            };

            ws.current.onclose = (event) => {
                console.log('WebSocket disconnected, code:', event.code, 'reason:', event.reason);
                setIsConnected(false);
                setIsInRoom(false);
            };

            ws.current.onmessage = async (event) => {
                try {
                    const data: WebSocketMessage = JSON.parse(event.data);
                    console.log('Received message:', data);

                    if (data.type === 'room_info') {
                        setUsers(data.data.users || []);
                    }
                    else if (data.type === 'error') {
                        setError(data.data);
                    }
                    else if (data.type === 'offer') {
                        if (pc.current && ws.current?.readyState === WebSocket.OPEN && data.sdp) {
                            try {
                                if (isNegotiating.current) {
                                    console.log('Already negotiating, ignoring offer');
                                    return;
                                }

                                isNegotiating.current = true;
                                await pc.current.setRemoteDescription(
                                    new RTCSessionDescription(data.sdp)
                                );

                                const answer = await pc.current.createAnswer({
                                    offerToReceiveAudio: true,
                                    offerToReceiveVideo: true
                                });

                                const normalizedAnswer = {
                                    ...answer,
                                    sdp: normalizeSdp(answer.sdp)
                                };

                                await pc.current.setLocalDescription(normalizedAnswer);

                                ws.current.send(JSON.stringify({
                                    type: 'answer',
                                    sdp: normalizedAnswer,
                                    room: roomId,
                                    username
                                }));

                                setIsCallActive(true);
                                isNegotiating.current = false;
                            } catch (err) {
                                console.error('Error handling offer:', err);
                                setError('Ошибка обработки предложения соединения');
                                isNegotiating.current = false;
                            }
                        }
                    }
                    else if (data.type === 'answer') {
                        if (pc.current && data.sdp) {
                            try {
                                if (pc.current.signalingState !== 'have-local-offer') {
                                    console.log('Not in have-local-offer state, ignoring answer');
                                    return;
                                }

                                const normalizedAnswer = {
                                    ...data.sdp,
                                    sdp: normalizeSdp(data.sdp.sdp)
                                };

                                await pc.current.setRemoteDescription(
                                    new RTCSessionDescription(normalizedAnswer)
                                );

                                setIsCallActive(true);

                                pendingIceCandidates.current.forEach(candidate => {
                                    pc.current?.addIceCandidate(new RTCIceCandidate(candidate));
                                });
                                pendingIceCandidates.current = [];
                            } catch (err) {
                                console.error('Error setting answer:', err);
                                setError('Ошибка установки ответа соединения');
                            }
                        }
                    }
                    else if (data.type === 'ice_candidate') {
                        if (data.ice) {
                            const candidate = new RTCIceCandidate(data.ice);

                            if (pc.current && pc.current.remoteDescription) {
                                await pc.current.addIceCandidate(candidate);
                            } else {
                                pendingIceCandidates.current.push(candidate);
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error processing message:', err);
                    setError('Ошибка обработки сообщения сервера');
                }
            };

            return true;
        } catch (err) {
            console.error('WebSocket connection error:', err);
            setError('Не удалось подключиться к серверу');
            return false;
        }
    };

    const createAndSendOffer = async () => {
        if (!pc.current || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            const offer = await pc.current.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });

            const normalizedOffer = {
                ...offer,
                sdp: normalizeSdp(offer.sdp)
            };

            await pc.current.setLocalDescription(normalizedOffer);

            ws.current.send(JSON.stringify({
                type: "offer",
                sdp: normalizedOffer,
                room: roomId,
                username
            }));

            setIsCallActive(true);
        } catch (err) {
            console.error('Error creating offer:', err);
            setError('Ошибка создания предложения соединения');
        }
    };

    const initializeWebRTC = async () => {
        try {
            cleanup();

            const config = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' }
                ],
                iceTransportPolicy: 'all',
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require',
                sdpSemantics: 'unified-plan' as const
            };

            pc.current = new RTCPeerConnection(config);

            const stream = await navigator.mediaDevices.getUserMedia({
                video: deviceIds.video ? {
                    deviceId: { exact: deviceIds.video },
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                } : true,
                audio: deviceIds.audio ? {
                    deviceId: { exact: deviceIds.audio },
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } : true
            });

            setLocalStream(stream);
            stream.getTracks().forEach(track => {
                pc.current?.addTrack(track, stream);
            });

            pc.current.onicecandidate = (event) => {
                if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify({
                        type: 'ice_candidate',
                        ice: event.candidate,
                        room: roomId,
                        username
                    }));
                }
            };

            pc.current.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                }
            };

            pc.current.oniceconnectionstatechange = () => {
                if (pc.current) {
                    console.log('ICE connection state:', pc.current.iceConnectionState);
                    if (pc.current.iceConnectionState === 'failed') {
                        console.log('Restarting ICE...');
                        pc.current.restartIce();
                    }
                }
            };

            return true;
        } catch (err) {
            console.error('WebRTC initialization error:', err);
            setError('Не удалось инициализировать WebRTC');
            cleanup();
            return false;
        }
    };

    const joinRoom = async (uniqueUsername: string) => {
        setError(null);

        if (!connectWebSocket()) {
            return;
        }

        if (!(await initializeWebRTC())) {
            return;
        }

        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                action: "join",
                room: roomId,
                username: uniqueUsername
            }));
            setIsInRoom(true);
            shouldCreateOffer.current = true;

            if (ws.current.readyState === WebSocket.OPEN) {
                await createAndSendOffer();
            }
        } else {
            shouldCreateOffer.current = true;
        }
    };

    useEffect(() => {
        return () => {
            leaveRoom();
        };
    }, []);

    return {
        localStream,
        remoteStream,
        users,
        joinRoom,
        leaveRoom,
        isCallActive,
        isConnected,
        isInRoom,
        error
    };
};