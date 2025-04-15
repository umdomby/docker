import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
    type: string;
    data?: any;
    sdp?: {
        type: RTCSdpType;
        sdp: string;
    };
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

    const normalizeSdp = (sdp: string | undefined): string => {
        if (!sdp) return '';

        // Убедимся, что SDP содержит все обязательные поля
        let lines = sdp.trim().split('\r\n');

        // Добавляем обязательные строки, если их нет
        if (!lines[0].startsWith('v=')) {
            lines.unshift('v=0');
        }
        if (!lines.some(line => line.startsWith('o='))) {
            lines.splice(1, 0, 'o=- 0 0 IN IP4 0.0.0.0');
        }
        if (!lines.some(line => line.startsWith('s='))) {
            lines.splice(2, 0, 's=-');
        }
        if (!lines.some(line => line.startsWith('t='))) {
            lines.splice(3, 0, 't=0 0');
        }

        return lines.join('\r\n') + '\r\n';
    };

    const validateMediaOrder = (offerSdp: string | undefined, answerSdp: string | undefined): boolean => {
        if (!offerSdp || !answerSdp) return false;

        const offerMedia = offerSdp.split('\r\n')
            .filter(line => line.startsWith('m='))
            .map(line => line.split(' ')[0]);

        const answerMedia = answerSdp.split('\r\n')
            .filter(line => line.startsWith('m='))
            .map(line => line.split(' ')[0]);

        return offerMedia.length === answerMedia.length &&
            offerMedia.every((val, index) => val === answerMedia[index]);
    };

    const reorderAnswerMedia = (offerSdp: string | undefined, answerSdp: string | undefined): string => {
        if (!offerSdp || !answerSdp) return answerSdp || '';

        const offerMediaOrder = offerSdp.split('\r\n')
            .filter(line => line.startsWith('m='))
            .map(line => line.split(' ')[0]);

        const answerLines = answerSdp.split('\r\n');
        const mediaSections: string[][] = [];
        let currentSection: string[] = [];

        for (const line of answerLines) {
            if (line.startsWith('m=')) {
                if (currentSection.length > 0) {
                    mediaSections.push(currentSection);
                }
                currentSection = [line];
            } else if (line !== '') {
                currentSection.push(line);
            }
        }
        if (currentSection.length > 0) {
            mediaSections.push(currentSection);
        }

        const reorderedSections: string[][] = [];
        for (const mediaType of offerMediaOrder) {
            const foundSection = mediaSections.find(section =>
                section[0].startsWith(mediaType));
            if (foundSection) {
                reorderedSections.push(foundSection);
            }
        }

        const reorderedLines: string[] = [];
        for (const section of reorderedSections) {
            reorderedLines.push(...section, '');
        }

        return reorderedLines.join('\r\n').trim() + '\r\n';
    };

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

    const connectWebSocket = () => {
        try {
            ws.current = new WebSocket('wss://anybet.site/ws');

            ws.current.onopen = () => {
                setIsConnected(true);
                setError(null);
                console.log('WebSocket подключен');

                if (shouldCreateOffer.current && pc.current) {
                    createAndSendOffer();
                }
            };

            ws.current.onerror = (event) => {
                console.error('Ошибка WebSocket:', event);
                setError('Ошибка подключения');
                setIsConnected(false);
            };

            ws.current.onclose = (event) => {
                console.log('WebSocket отключен, код:', event.code, 'причина:', event.reason);
                setIsConnected(false);
                setIsInRoom(false);
            };

            ws.current.onmessage = async (event) => {
                try {
                    const data: WebSocketMessage = JSON.parse(event.data);
                    console.log('Получено сообщение:', data);

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
                                    console.log('Уже в процессе переговоров, игнорируем оффер');
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
                                console.error('Ошибка обработки оффера:', err);
                                setError('Ошибка обработки предложения соединения');
                                isNegotiating.current = false;
                            }
                        }
                    }
                    else if (data.type === 'answer') {
                        if (pc.current && data.sdp) {
                            try {
                                if (pc.current.signalingState !== 'have-local-offer') {
                                    console.log('Не в состоянии have-local-offer, игнорируем ответ');
                                    return;
                                }

                                const offerSdp = pc.current.localDescription?.sdp;
                                const answerSdp = data.sdp.sdp;

                                if (!validateMediaOrder(offerSdp, answerSdp)) {
                                    console.log('Порядок медиа-секций не совпадает, реорганизуем...');
                                    data.sdp.sdp = reorderAnswerMedia(offerSdp, answerSdp);
                                }

                                const answerDescription: RTCSessionDescriptionInit = {
                                    type: 'answer',
                                    sdp: data.sdp.sdp
                                };

                                console.log('Устанавливаем удаленное описание с ответом');
                                await pc.current.setRemoteDescription(
                                    new RTCSessionDescription(answerDescription)
                                );

                                setIsCallActive(true);

                                for (const candidate of pendingIceCandidates.current) {
                                    try {
                                        await pc.current.addIceCandidate(candidate);
                                    } catch (err) {
                                        console.error('Ошибка добавления ICE-кандидата:', err);
                                    }
                                }
                                pendingIceCandidates.current = [];
                            } catch (err) {
                                console.error('Ошибка установки ответа:', err);
                                setError(`Ошибка установки ответа соединения: ${err instanceof Error ? err.message : String(err)}`);
                            }
                        }
                    }
                    else if (data.type === 'ice_candidate') {
                        if (data.ice) {
                            try {
                                const candidate = new RTCIceCandidate(data.ice);

                                if (pc.current && pc.current.remoteDescription) {
                                    await pc.current.addIceCandidate(candidate);
                                } else {
                                    pendingIceCandidates.current.push(candidate);
                                }
                            } catch (err) {
                                console.error('Ошибка добавления ICE-кандидата:', err);
                                setError('Ошибка добавления ICE-кандидата');
                            }
                        }
                    }
                } catch (err) {
                    console.error('Ошибка обработки сообщения:', err);
                    setError('Ошибка обработки сообщения сервера');
                }
            };

            return true;
        } catch (err) {
            console.error('Ошибка подключения WebSocket:', err);
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

            const standardizedOffer = {
                ...offer,
                sdp: normalizeSdp(offer.sdp)
            };

            console.log('Устанавливаем локальное описание с оффером');
            await pc.current.setLocalDescription(standardizedOffer);

            ws.current.send(JSON.stringify({
                type: "offer",
                sdp: standardizedOffer,
                room: roomId,
                username
            }));

            setIsCallActive(true);
        } catch (err) {
            console.error('Ошибка создания оффера:', err);
            setError('Ошибка создания предложения соединения');
        }
    };

    const initializeWebRTC = async () => {
        try {
            cleanup();

            const config: RTCConfiguration = {
                iceServers: [
                    {
                        urls: [
                            'stun:stun.l.google.com:19302',
                            'stun:stun1.l.google.com:19302',
                            'stun:stun2.l.google.com:19302',
                            'stun:stun3.l.google.com:19302',
                            'stun:stun4.l.google.com:19302'
                        ]
                    },
                    {
                        urls: 'stun:stun.voipbuster.com:3478'
                    },
                    {
                        urls: 'stun:stun.ideasip.com'
                    }
                ],
                iceTransportPolicy: 'all',
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require'
            };

            pc.current = new RTCPeerConnection(config);

            pc.current.onnegotiationneeded = () => {
                console.log('Требуется переговорный процесс');
            };

            pc.current.onsignalingstatechange = () => {
                console.log('Состояние сигнализации изменилось:', pc.current?.signalingState);
            };

            pc.current.onicegatheringstatechange = () => {
                console.log('Состояние сбора ICE изменилось:', pc.current?.iceGatheringState);
            };

            pc.current.onicecandidateerror = (event) => {
                // Игнорируем определенные типы ошибок
                const ignorableErrors = [
                    701, // STUN: DNS resolution failed
                    702, // STUN: Server returned error response
                    703  // STUN: Authentication failed
                ];

                if (!ignorableErrors.includes(event.errorCode)) {
                    console.error('Критическая ошибка ICE кандидата:', {
                        errorCode: event.errorCode,
                        errorText: event.errorText,
                        address: event.address,
                        port: event.port,
                        url: event.url
                    });
                    setError(`Ошибка соединения: ${event.errorText}`);
                } else {
                    console.log('Игнорируемая ошибка ICE:', event.errorText);
                }
            };

            const iceTimeout = setTimeout(() => {
                if (pc.current?.iceGatheringState !== 'complete') {
                    console.warn('Таймаут сбора ICE кандидатов');
                    if (pc.current?.localDescription) {
                        // Форсируем завершение если есть локальное описание
                        pc.current.dispatchEvent(new Event('icecandidate', { candidate: null }));
                    }
                }
            }, 5000); // 5 секунд таймаут

            pc.current.onicegatheringstatechange = () => {
                console.log('Состояние сбора ICE изменилось:', pc.current?.iceGatheringState);
                if (pc.current?.iceGatheringState === 'complete') {
                    clearTimeout(iceTimeout);
                }
            };

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
                    try {
                        // Фильтруем нежелательные кандидаты
                        if (shouldSendIceCandidate(event.candidate)) {
                            ws.current.send(JSON.stringify({
                                type: 'ice_candidate',
                                ice: {
                                    candidate: event.candidate.candidate,
                                    sdpMid: event.candidate.sdpMid || '0',
                                    sdpMLineIndex: event.candidate.sdpMLineIndex || 0
                                },
                                room: roomId,
                                username
                            }));
                        }
                    } catch (err) {
                        console.error('Ошибка отправки ICE кандидата:', err);
                    }
                }
            };

            pc.current.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                }
            };

            pc.current.oniceconnectionstatechange = () => {
                if (!pc.current) return;

                console.log('Состояние ICE соединения:', pc.current.iceConnectionState);

                switch (pc.current.iceConnectionState) {
                    case 'failed':
                        console.log('Перезапуск ICE...');
                        // Попытка восстановления соединения
                        setTimeout(() => {
                            if (pc.current && pc.current.iceConnectionState === 'failed') {
                                pc.current.restartIce();
                                if (isInRoom && !isCallActive) {
                                    createAndSendOffer().catch(console.error);
                                }
                            }
                        }, 1000);
                        break;

                    case 'disconnected':
                        console.log('Соединение прервано...');
                        setIsCallActive(false);
                        // Попытка восстановления через 2 секунды
                        setTimeout(() => {
                            if (pc.current && pc.current.iceConnectionState === 'disconnected') {
                                createAndSendOffer().catch(console.error);
                            }
                        }, 2000);
                        break;

                    case 'connected':
                        console.log('Соединение установлено!');
                        setIsCallActive(true);
                        break;

                    case 'closed':
                        console.log('Соединение закрыто');
                        setIsCallActive(false);
                        break;
                }
            };

            return true;
        } catch (err) {
            console.error('Ошибка инициализации WebRTC:', err);
            setError('Не удалось инициализировать WebRTC');
            cleanup();
            return false;
        }
    };

    function shouldSendIceCandidate(candidate: RTCIceCandidate): boolean {
        // Не отправляем кандидаты с пустым описанием
        if (!candidate.candidate || candidate.candidate.length === 0) {
            return false;
        }

        // Фильтруем определенные типы кандидатов
        const excludedTypes = ['host', 'srflx'];
        const candidateType = candidate.candidate.split(' ')[7];

        // Фильтруем локальные IP-адреса
        const isLocalIP = candidate.candidate.includes('192.168.') ||
            candidate.candidate.includes('172.') ||
            candidate.candidate.includes('10.');

        return !excludedTypes.includes(candidateType) && !isLocalIP;
    }

    const joinRoom = async (uniqueUsername: string) => {
        setError(null);
        setIsInRoom(false);

        try {
            // Сначала инициализируем WebRTC
            if (!(await initializeWebRTC())) {
                throw new Error('Не удалось инициализировать WebRTC');
            }

            // Затем подключаем WebSocket
            if (!connectWebSocket()) {
                throw new Error('Не удалось подключиться к WebSocket');
            }

            // Ждем подключения WebSocket
            await new Promise((resolve, reject) => {
                const checkConnection = () => {
                    if (ws.current?.readyState === WebSocket.OPEN) {
                        resolve(true);
                    } else if (ws.current?.readyState === WebSocket.CLOSED) {
                        reject(new Error('WebSocket закрыт'));
                    } else {
                        setTimeout(checkConnection, 100);
                    }
                };
                checkConnection();
            });

            // Отправляем запрос на присоединение
            ws.current?.send(JSON.stringify({
                action: "join",
                room: roomId,
                username: uniqueUsername
            }));

            setIsInRoom(true);
            shouldCreateOffer.current = true;

            // Создаем оффер только если мы первые в комнате
            if (users.length === 0) {
                await createAndSendOffer();
            }
        } catch (err) {
            console.error('Ошибка входа в комнату:', err);
            setError(`Ошибка входа в комнату: ${err instanceof Error ? err.message : String(err)}`);
            cleanup();
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