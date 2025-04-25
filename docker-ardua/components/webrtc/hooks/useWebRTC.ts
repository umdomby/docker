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
    // Добавляем новый тип сообщения
    force_disconnect?: boolean;
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
    const [retryCount, setRetryCount] = useState(0);

    const ws = useRef<WebSocket | null>(null);
    const pc = useRef<RTCPeerConnection | null>(null);
    const pendingIceCandidates = useRef<RTCIceCandidate[]>([]);
    const isNegotiating = useRef(false);
    const shouldCreateOffer = useRef(false);
    const connectionTimeout = useRef<NodeJS.Timeout | null>(null);
    const statsInterval = useRef<NodeJS.Timeout | null>(null);
    const videoCheckTimeout = useRef<NodeJS.Timeout | null>(null);
    const retryAttempts = useRef(0);

    // Максимальное количество попыток переподключения
    const MAX_RETRIES = 10;
    const VIDEO_CHECK_TIMEOUT = 4000; // 4 секунд для проверки видео

    const normalizeSdp = (sdp: string | undefined): string => {
        if (!sdp) return '';

        // Сначала очищаем от network-cost
        let normalized = sdp.replace(/a=network-cost:.+\r\n/g, '');

        normalized = normalized.trim();

        if (!normalized.startsWith('v=')) {
            normalized = 'v=0\r\n' + normalized;
        }
        if (!normalized.includes('\r\no=')) {
            normalized = normalized.replace('\r\n', '\r\no=- 0 0 IN IP4 0.0.0.0\r\n');
        }
        if (!normalized.includes('\r\ns=')) {
            normalized = normalized.replace('\r\n', '\r\ns=-\r\n');
        }
        if (!normalized.includes('\r\nt=')) {
            normalized = normalized.replace('\r\n', '\r\nt=0 0\r\n');
        }

        return normalized + '\r\n';
    };

    const cleanup = () => {
        // Очистка таймеров
        if (connectionTimeout.current) {
            clearTimeout(connectionTimeout.current);
            connectionTimeout.current = null;
        }

        if (statsInterval.current) {
            clearInterval(statsInterval.current);
            statsInterval.current = null;
        }

        if (videoCheckTimeout.current) {
            clearTimeout(videoCheckTimeout.current);
            videoCheckTimeout.current = null;
        }

        // Очистка WebRTC соединения
        if (pc.current) {
            pc.current.onicecandidate = null;
            pc.current.ontrack = null;
            pc.current.onnegotiationneeded = null;
            pc.current.oniceconnectionstatechange = null;
            pc.current.close();
            pc.current = null;
        }

        // Остановка медиапотоков
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }

        if (remoteStream) {
            remoteStream.getTracks().forEach(track => {
                track.stop();
                track.dispatchEvent(new Event('ended')); // Принудительно вызываем событие завершения
            });
        }

        setIsCallActive(false);
        pendingIceCandidates.current = [];
        isNegotiating.current = false;
        shouldCreateOffer.current = false;
        retryAttempts.current = 0;
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
        setRetryCount(0);
    };

    const startVideoCheckTimer = () => {
        // Очищаем предыдущий таймер, если он есть
        if (videoCheckTimeout.current) {
            clearTimeout(videoCheckTimeout.current);
        }

        // Устанавливаем новый таймер
        videoCheckTimeout.current = setTimeout(() => {
            if (!remoteStream || remoteStream.getVideoTracks().length === 0 ||
                !remoteStream.getVideoTracks()[0].readyState) {
                console.log('Удаленное видео не получено в течение .. секунд, перезапускаем соединение...');
                resetConnection();
            }
        }, VIDEO_CHECK_TIMEOUT);
    };

    const connectWebSocket = async (): Promise<boolean> => {
        return new Promise((resolve) => {
            if (ws.current?.readyState === WebSocket.OPEN) {
                resolve(true);
                return;
            }

            try {
                ws.current = new WebSocket('wss://ardua.site/ws');

                const onOpen = () => {
                    cleanupEvents();
                    setIsConnected(true);
                    setError(null);
                    console.log('WebSocket подключен');
                    resolve(true);
                };

                const onError = (event: Event) => {
                    cleanupEvents();
                    console.error('Ошибка WebSocket:', event);
                    setError('Ошибка подключения');
                    setIsConnected(false);
                    resolve(false);
                };

                const onClose = (event: CloseEvent) => {
                    cleanupEvents();
                    console.log('WebSocket отключен:', event.code, event.reason);
                    setIsConnected(false);
                    setIsInRoom(false);
                    setError(event.code !== 1000 ? `Соединение закрыто: ${event.reason || 'код ' + event.code}` : null);
                    resolve(false);
                };

                const cleanupEvents = () => {
                    ws.current?.removeEventListener('open', onOpen);
                    ws.current?.removeEventListener('error', onError);
                    ws.current?.removeEventListener('close', onClose);
                    if (connectionTimeout.current) {
                        clearTimeout(connectionTimeout.current);
                    }
                };

                connectionTimeout.current = setTimeout(() => {
                    cleanupEvents();
                    setError('Таймаут подключения WebSocket');
                    resolve(false);
                }, 5000);

                ws.current.addEventListener('open', onOpen);
                ws.current.addEventListener('error', onError);
                ws.current.addEventListener('close', onClose);

            } catch (err) {
                console.error('Ошибка создания WebSocket:', err);
                setError('Не удалось создать WebSocket соединение');
                resolve(false);
            }
        });
    };



    const setupWebSocketListeners = () => {
        if (!ws.current) return;

        const handleMessage = async (event: MessageEvent) => {
            try {
                const data: WebSocketMessage = JSON.parse(event.data);
                console.log('Получено сообщение:', data);

                // Добавляем обработку switch_camera
                if (data.type === 'switch_camera_ack') {
                    console.log('Камера на Android успешно переключена');
                    // Можно показать уведомление пользователю
                }

                // Добавляем обработку reconnect_request
                if (data.type === 'reconnect_request') {
                    console.log('Server requested reconnect');
                    setTimeout(() => {
                        resetConnection();
                    }, 1000);
                    return;
                }

                if (data.type === 'force_disconnect') {
                    // Обработка принудительного отключения
                    console.log('Получена команда принудительного отключения');
                    setError('Вы были отключены, так как подключился другой зритель');

                    // Останавливаем все медиапотоки
                    if (remoteStream) {
                        remoteStream.getTracks().forEach(track => track.stop());
                    }

                    // Закрываем PeerConnection
                    if (pc.current) {
                        pc.current.close();
                        pc.current = null;
                    }
                    leaveRoom();
                    // Очищаем состояние
                    setRemoteStream(null);
                    setIsCallActive(false);
                    setIsInRoom(false);

                    return;
                }


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

                            // Запускаем проверку получения видео
                            startVideoCheckTimer();
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

                            const answerDescription: RTCSessionDescriptionInit = {
                                type: 'answer',
                                sdp: normalizeSdp(data.sdp.sdp)
                            };

                            console.log('Устанавливаем удаленное описание с ответом');
                            await pc.current.setRemoteDescription(
                                new RTCSessionDescription(answerDescription)
                            );

                            setIsCallActive(true);

                            // Запускаем проверку получения видео
                            startVideoCheckTimer();

                            // Обрабатываем ожидающие кандидаты
                            while (pendingIceCandidates.current.length > 0) {
                                const candidate = pendingIceCandidates.current.shift();
                                if (candidate) {
                                    try {
                                        await pc.current.addIceCandidate(candidate);
                                    } catch (err) {
                                        console.error('Ошибка добавления отложенного ICE кандидата:', err);
                                    }
                                }
                            }
                        } catch (err) {
                            console.error('Ошибка установки ответа:', err);
                            setError(`Ошибка установки ответа: ${err instanceof Error ? err.message : String(err)}`);
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

        ws.current.onmessage = handleMessage;
    };

    const createAndSendOffer = async () => {
        if (!pc.current || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            const offer = await pc.current.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
                iceRestart: false,
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

            // Запускаем проверку получения видео
            startVideoCheckTimer();
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
                            'turn:ardua.site:3478',  // UDP/TCP
                            'turns:ardua.site:5349'   // TLS (если настроен)
                        ],
                        username: 'user1',     // Исправлено: username
                        credential: 'pass1'    // Исправлено: credential
                    },
                    {
                        urls: [
                            'stun:stun.l.google.com:19301',
                            'stun:stun.l.google.com:19302',
                            'stun:stun.l.google.com:19303',
                            'stun:stun.l.google.com:19304',
                            'stun:stun.l.google.com:19305',
                            'stun:stun1.l.google.com:19301',
                            'stun:stun1.l.google.com:19302',
                            'stun:stun1.l.google.com:19303',
                            'stun:stun1.l.google.com:19304',
                            'stun:stun1.l.google.com:19305'
                        ]
                    }
                ],
                iceTransportPolicy: 'all',
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require'
            };

            pc.current = new RTCPeerConnection(config);

            // Обработчики событий WebRTC
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
                const ignorableErrors = [701, 702, 703]; // Игнорируем стандартные ошибки STUN
                if (!ignorableErrors.includes(event.errorCode)) {
                    console.error('Критическая ошибка ICE кандидата:', event);
                    setError(`Ошибка ICE соединения: ${event.errorText}`);
                }
            };

            // Получаем медиапоток с устройства
            const stream = await navigator.mediaDevices.getUserMedia({
                video: deviceIds.video ? {
                    deviceId: { exact: deviceIds.video },
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                } : {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                },
                audio: deviceIds.audio ? {
                    deviceId: { exact: deviceIds.audio },
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } : true
            });

            // Проверяем наличие видеотрека
            const videoTracks = stream.getVideoTracks();
            if (videoTracks.length === 0) {
                throw new Error('Не удалось получить видеопоток с устройства');
            }

            setLocalStream(stream);
            stream.getTracks().forEach(track => {
                pc.current?.addTrack(track, stream);
            });

            // Обработка ICE кандидатов
            pc.current.onicecandidate = (event) => {
                if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
                    try {
                        // Фильтруем нежелательные кандидаты
                        if (event.candidate.candidate &&
                            event.candidate.candidate.length > 0 &&
                            !event.candidate.candidate.includes('0.0.0.0')) {

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

            // Обработка входящих медиапотоков
            pc.current.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    // Проверяем, что видеопоток содержит данные
                    const videoTrack = event.streams[0].getVideoTracks()[0];
                    if (videoTrack) {
                        const videoElement = document.createElement('video');
                        videoElement.srcObject = new MediaStream([videoTrack]);
                        videoElement.onloadedmetadata = () => {
                            if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                                setRemoteStream(event.streams[0]);
                                setIsCallActive(true);

                                // Видео получено, очищаем таймер проверки
                                if (videoCheckTimeout.current) {
                                    clearTimeout(videoCheckTimeout.current);
                                    videoCheckTimeout.current = null;
                                }
                            } else {
                                console.warn('Получен пустой видеопоток');
                            }
                        };
                    } else {
                        console.warn('Входящий поток не содержит видео');
                    }
                }
            };

            // Обработка состояния ICE соединения
            pc.current.oniceconnectionstatechange = () => {
                if (!pc.current) return;

                if (pc.current?.iceConnectionState === 'disconnected' ||
                    pc.current?.iceConnectionState === 'failed') {
                    console.log('ICE соединение разорвано, возможно нас заменили');
                    leaveRoom();
                }

                console.log('Состояние ICE соединения:', pc.current.iceConnectionState);

                switch (pc.current.iceConnectionState) {
                    case 'failed':
                        console.log('Перезапуск ICE...');
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

            // Запускаем мониторинг статистики соединения
            startConnectionMonitoring();

            return true;
        } catch (err) {
            console.error('Ошибка инициализации WebRTC:', err);
            setError(`Не удалось инициализировать WebRTC: ${err instanceof Error ? err.message : String(err)}`);
            cleanup();
            return false;
        }
    };

    const startConnectionMonitoring = () => {
        if (statsInterval.current) {
            clearInterval(statsInterval.current);
        }

        statsInterval.current = setInterval(async () => {
            if (!pc.current || !isCallActive) return;

            try {
                const stats = await pc.current.getStats();
                let hasActiveVideo = false;

                stats.forEach(report => {
                    if (report.type === 'inbound-rtp' && report.kind === 'video') {
                        if (report.bytesReceived > 0) {
                            hasActiveVideo = true;
                        }
                    }
                });

                if (!hasActiveVideo && isCallActive) {
                    console.warn('Нет активного видеопотока, пытаемся восстановить...');
                    resetConnection();
                }
            } catch (err) {
                console.error('Ошибка получения статистики:', err);
            }
        }, 5000);
    };

    const resetConnection = async () => {
        if (retryAttempts.current >= MAX_RETRIES) {
            setError('Не удалось восстановить соединение после нескольких попыток');
            leaveRoom();
            return;
        }

        retryAttempts.current += 1;
        setRetryCount(retryAttempts.current);
        console.log(`Попытка восстановления #${retryAttempts.current}`);

        try {
            await leaveRoom();
            await new Promise(resolve => setTimeout(resolve, 1000 * retryAttempts.current));
            await joinRoom(username);
        } catch (err) {
            console.error('Ошибка при восстановлении соединения:', err);
        }
    };

    const restartMediaDevices = async () => {
        try {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: deviceIds.video ? {
                    deviceId: { exact: deviceIds.video },
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                } : {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                },
                audio: deviceIds.audio ? {
                    deviceId: { exact: deviceIds.audio },
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } : true
            });

            setLocalStream(stream);

            if (pc.current) {
                const senders = pc.current.getSenders();
                stream.getTracks().forEach(track => {
                    const sender = senders.find(s => s.track?.kind === track.kind);
                    if (sender) {
                        sender.replaceTrack(track);
                    } else {
                        pc.current?.addTrack(track, stream);
                    }
                });
            }

            return true;
        } catch (err) {
            console.error('Ошибка перезагрузки медиаустройств:', err);
            setError('Ошибка доступа к медиаустройствам');
            return false;
        }
    };

    const joinRoom = async (uniqueUsername: string) => {
        setError(null);
        setIsInRoom(false);
        setIsConnected(false);

        try {
            // 1. Подключаем WebSocket
            if (!(await connectWebSocket())) {
                throw new Error('Не удалось подключиться к WebSocket');
            }

            setupWebSocketListeners();

            // 2. Инициализируем WebRTC
            if (!(await initializeWebRTC())) {
                throw new Error('Не удалось инициализировать WebRTC');
            }

            // 3. Отправляем запрос на присоединение к комнате
            await new Promise<void>((resolve, reject) => {
                if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
                    reject(new Error('WebSocket не подключен'));
                    return;
                }

                const onMessage = (event: MessageEvent) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'room_info') {
                            cleanupEvents();
                            resolve();
                        } else if (data.type === 'error') {
                            cleanupEvents();
                            reject(new Error(data.data || 'Ошибка входа в комнату'));
                        }
                    } catch (err) {
                        cleanupEvents();
                        reject(err);
                    }
                };

                const cleanupEvents = () => {
                    ws.current?.removeEventListener('message', onMessage);
                    if (connectionTimeout.current) {
                        clearTimeout(connectionTimeout.current);
                    }
                };

                connectionTimeout.current = setTimeout(() => {
                    cleanupEvents();
                    console.log('Таймаут ожидания ответа от сервера');
                }, 10000);

                ws.current.addEventListener('message', onMessage);
                ws.current.send(JSON.stringify({
                    action: "join",
                    room: roomId,
                    username: uniqueUsername,
                    isLeader: false // Браузер всегда ведомый
                }));
            });

            // 4. Успешное подключение
            setIsInRoom(true);
            shouldCreateOffer.current = true;

            // 5. Создаем оффер, если мы первые в комнате
            if (users.length === 0) {
                await createAndSendOffer();
            }

            // 6. Запускаем таймер проверки видео
            startVideoCheckTimer();

        } catch (err) {
            console.error('Ошибка входа в комнату:', err);
            setError(`Ошибка входа в комнату: ${err instanceof Error ? err.message : String(err)}`);

            // Полная очистка при ошибке
            cleanup();
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }

            // Автоматическая повторная попытка
            if (retryAttempts.current < MAX_RETRIES) {
                setTimeout(() => {
                    joinRoom(uniqueUsername).catch(console.error);
                }, 2000 * (retryAttempts.current + 1));
            }
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
        error,
        retryCount,
        resetConnection,
        restartMediaDevices,
        ws: ws.current, // Возвращаем текущее соединение
    };
};