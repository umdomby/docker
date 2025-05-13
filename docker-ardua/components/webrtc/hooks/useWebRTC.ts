import { useEffect, useRef, useState } from 'react';
import {RoomInfo} from "@/components/webrtc/types";

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
    isLeader?: boolean;
    force_disconnect?: boolean;
}

interface RoomInfoMessage extends WebSocketMessage {
    type: 'room_info';
    data: RoomInfo;
}

interface CustomRTCRtpCodecParameters extends RTCRtpCodecParameters {
    parameters?: {
        'level-asymmetry-allowed'?: number;
        'packetization-mode'?: number;
        'profile-level-id'?: string;
        [key: string]: any;
    };
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
    const [isLeader, setIsLeader] = useState(false);
    const ws = useRef<WebSocket | null>(null);
    const pc = useRef<RTCPeerConnection | null>(null);
    const pendingIceCandidates = useRef<RTCIceCandidate[]>([]);
    const isNegotiating = useRef(false);
    const shouldCreateOffer = useRef(false);
    const connectionTimeout = useRef<NodeJS.Timeout | null>(null);
    const statsInterval = useRef<NodeJS.Timeout | null>(null);
    const videoCheckTimeout = useRef<NodeJS.Timeout | null>(null);
    const retryAttempts = useRef(0);

    // Добавляем функцию для определения платформы
    const detectPlatform = () => {
        const ua = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua);
        const isSafari = /^((?!chrome|android).)*safari/i.test(ua) || isIOS;
        return {
            isIOS,
            isSafari,
            isChrome: /chrome/i.test(ua),
            isHuawei: /huawei/i.test(ua),
            isAndroid: /Android/i.test(ua),
            isMobile: isIOS || /Android/i.test(ua)
        };
    };

    // Максимальное количество попыток переподключения
    const MAX_RETRIES = 10;
    const VIDEO_CHECK_TIMEOUT = 7000; // 4 секунд для проверки видео



    // 1. Улучшенная функция для получения параметров видео для Huawei
    const getVideoConstraints = () => {
        const { isHuawei, isSafari, isIOS, isMobile } = detectPlatform();
        // Специальные параметры для Huawei
        if (isHuawei) {
            return {
                width: { ideal: 480, max: 640 },
                height: { ideal: 360, max: 480 },
                frameRate: { ideal: 20, max: 24 },
                // Huawei лучше работает с этими параметрами
                facingMode: 'environment',
                resizeMode: 'crop-and-scale'
            };
        }

        // Базовые параметры для всех устройств
        const baseConstraints = {
            width: { ideal: isMobile ? 640 : 1280 },
            height: { ideal: isMobile ? 480 : 720 },
            frameRate: { ideal: isMobile ? 24 : 30 }
        };

        // Специфичные настройки для Huawei
        if (isHuawei) {
            return {
                ...baseConstraints,
                width: { ideal: 480 },
                height: { ideal: 360 },
                frameRate: { ideal: 24 },
                advanced: [{ width: { max: 480 } }]
            };
        }
        if (isIOS) {
            return {
                ...baseConstraints,
                facingMode: 'user', // Фронтальная камера по умолчанию
                deviceId: deviceIds.video ? { exact: deviceIds.video } : undefined,
                advanced: [
                    { facingMode: 'user' }, // Приоритет фронтальной камеры
                    { width: { max: 640 } },
                    { height: { max: 480 } },
                    { frameRate: { max: 24 } }
                ]
            };
        }

        // Специфичные настройки для Safari
        if (isSafari || isIOS) {
            return {
                ...baseConstraints,
                frameRate: { ideal: 24 }, // Чуть меньше FPS для стабильности
                advanced: [
                    { frameRate: { max: 24 } },
                    { width: { max: 640 }, height: { max: 480 } }
                ]
            };
        }

        return baseConstraints;
    };

// 2. Конфигурация видео-трансмиттера для Huawei
    const configureVideoSender = (sender: RTCRtpSender) => {
        const { isHuawei } = detectPlatform();

        if (isHuawei && sender.track?.kind === 'video') {
            const parameters = sender.getParameters();

            if (!parameters.encodings) {
                parameters.encodings = [{}];
            }

            // Используем только стандартные параметры
            parameters.encodings[0] = {
                ...parameters.encodings[0],
                maxBitrate: 300000,    // 300 kbps
                scaleResolutionDownBy: 1,
                maxFramerate: 15,
                priority: 'high',
                networkPriority: 'high'
            };

            try {
                sender.setParameters(parameters);
            } catch (err) {
                console.error('Ошибка настройки параметров видео:', err);
            }
        }
    };



    // 4. Мониторинг производительности для Huawei
    const startHuaweiPerformanceMonitor = () => {
        const { isHuawei } = detectPlatform();
        if (!isHuawei) return () => {};


        const monitorInterval = setInterval(async () => {
            if (!pc.current || !isCallActive) return;

            try {
                const stats = await pc.current.getStats();
                let videoStats: any = null;
                let connectionStats: any = null;

                stats.forEach(report => {
                    if (report.type === 'outbound-rtp' && report.kind === 'video') {
                        videoStats = report;
                    }
                    if (report.type === 'candidate-pair' && report.selected) {
                        connectionStats = report;
                    }
                });

                if (videoStats && connectionStats) {
                    // Адаптация при высокой потере пакетов или задержке
                    if (videoStats.packetsLost > 5 ||
                        (connectionStats.currentRoundTripTime && connectionStats.currentRoundTripTime > 0.5)) {
                        console.log('Высокие потери или задержка, уменьшаем качество');
                        adjustVideoQuality('lower');
                    }
                }
            } catch (err) {
                console.error('Ошибка мониторинга:', err);
            }
        }, 3000); // Более частый мониторинг для Huawei

        return () => clearInterval(monitorInterval);
    };

// 5. Функция адаптации качества видео
    const adjustVideoQuality = (direction: 'higher' | 'lower') => {
        const { isMobile } = detectPlatform();
        const senders = pc.current?.getSenders() || [];

        senders.forEach(sender => {
            if (sender.track?.kind === 'video') {
                const parameters = sender.getParameters();

                if (!parameters.encodings || parameters.encodings.length === 0) {
                    parameters.encodings = [{}];
                }

                // Базовые параметры для всех устройств
                const baseEncoding: RTCRtpEncodingParameters = {
                    ...parameters.encodings[0],
                    active: true,
                };

                // Для мобильных сетей используем более низкие битрейты
                if (isMobile) {
                    parameters.encodings[0] = {
                        ...baseEncoding,
                        maxBitrate: direction === 'higher' ? 300000 : 150000,
                        scaleResolutionDownBy: direction === 'higher' ? 1.0 : 1.5,
                        maxFramerate: direction === 'higher' ? 15 : 10,
                        priority: 'high',
                        networkPriority: 'high'
                    };
                } else {
                    // Для WiFi оставляем текущие настройки
                    parameters.encodings[0] = {
                        ...baseEncoding,
                        maxBitrate: direction === 'higher' ? 300000 : 150000,
                        scaleResolutionDownBy: direction === 'higher' ? 1.0 : 1.5,
                        maxFramerate: direction === 'higher' ? 15 : 10,
                        priority: 'high',
                        networkPriority: 'high'
                    };
                }

                try {
                    sender.setParameters(parameters);
                } catch (err) {
                    console.error('Ошибка изменения параметров:', err);
                }
            }
        });
    };

    const normalizeSdpForIOS = (sdp: string): string => {
        return sdp
            // Удаляем лишние RTX кодеки
            .replace(/a=rtpmap:\d+ rtx\/\d+\r\n/g, '')
            .replace(/a=fmtp:\d+ apt=\d+\r\n/g, '')
            // Упрощаем параметры
            .replace(/a=extmap:\d+ .*\r\n/g, '')
            // Форсируем низкую задержку
            .replace(/a=mid:video\r\n/g, 'a=mid:video\r\na=x-google-flag:conference\r\n')
            // Упрощаем SDP для лучшей совместимости с iOS
            .replace(/a=setup:actpass\r\n/g, 'a=setup:active\r\n')
            // Удаляем ICE options, которые могут мешать
            .replace(/a=ice-options:trickle\r\n/g, '')
            // Устанавливаем низкий битрейт для iOS
            .replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:300\r\n')
            // Форсируем H.264
            .replace(/a=rtpmap:\d+ H264\/\d+/g, 'a=rtpmap:$& profile-level-id=42e01f;packetization-mode=1')
            // Удаляем несовместимые параметры
            .replace(/a=rtcp-fb:\d+ goog-remb\r\n/g, '')
            .replace(/a=rtcp-fb:\d+ transport-cc\r\n/g, '');

    };


    // 3. Специальная нормализация SDP для Huawei
    const normalizeSdpForHuawei = (sdp: string): string => {
        const { isHuawei } = detectPlatform();

        if (!isHuawei) return sdp;

        return sdp
            // Приоритет H.264 baseline profile
            .replace(/a=rtpmap:(\d+) H264\/\d+/g,
                'a=rtpmap:$1 H264/90000\r\n' +
                'a=fmtp:$1 profile-level-id=42e01f;packetization-mode=1;level-asymmetry-allowed=1\r\n')
            // Уменьшаем размер GOP
            .replace(/a=fmtp:\d+/, '$&;sprop-parameter-sets=J0LgC5Q9QEQ=,KM4=;')
            // Оптимизации буферизации и битрейта
            .replace(/a=mid:video\r\n/g,
                'a=mid:video\r\n' +
                'b=AS:250\r\n' +  // Уменьшенный битрейт для Huawei
                'b=TIAS:250000\r\n' +
                'a=rtcp-fb:* ccm fir\r\n' +
                'a=rtcp-fb:* nack\r\n' +
                'a=rtcp-fb:* nack pli\r\n');

    };

    const normalizeSdp = (sdp: string, preferredCodec: string): string => {
        console.log(`Normalizing SDP with preferredCodec: ${preferredCodec}`);
        console.log('Input SDP:', sdp);
        let modifiedSdp = sdp;

        if (preferredCodec === 'VP8') {
            // Находим VP8 payload type и его RTX
            const vp8PayloadMatch = modifiedSdp.match(/a=rtpmap:(\d+) VP8\/90000\r\n/);
            const vp8Payload = vp8PayloadMatch ? vp8PayloadMatch[1] : null;
            const rtxPayloadMatch = modifiedSdp.match(new RegExp(`a=fmtp:(\\d+) apt=${vp8Payload}\\r\\n`));
            const rtxPayload = rtxPayloadMatch ? rtxPayloadMatch[1] : null;

            if (!vp8Payload) {
                console.warn('VP8 codec not found in SDP');
                return modifiedSdp;
            }

            console.log(`Found VP8 payload type: ${vp8Payload}, RTX payload type: ${rtxPayload}`);

            // Удаляем VP9, AV1 и их RTX
            modifiedSdp = modifiedSdp.replace(/a=rtpmap:\d+ VP9\/90000\r\n/g, '');
            modifiedSdp = modifiedSdp.replace(/a=rtpmap:\d+ AV1\/90000\r\n/g, '');
            modifiedSdp = modifiedSdp.replace(/a=fmtp:\d+ profile-id=\d+\r\n/g, '');
            modifiedSdp = modifiedSdp.replace(/a=fmtp:\d+ level-idx=\d+;profile=\d+;tier=\d+\r\n/g, '');
            modifiedSdp = modifiedSdp.replace(new RegExp(`a=rtpmap:(\\d+) rtx/90000\\r\\n(?!a=fmtp:\\1 apt=${vp8Payload}\\r\\n)`, 'g'), '');
            modifiedSdp = modifiedSdp.replace(new RegExp(`a=fmtp:(\\d+) apt=\\d+\\r\\n(?!a=fmtp:\\1 apt=${vp8Payload}\\r\\n)`, 'g'), '');

            // Парсим SDP по строкам для точечного удаления rtcp-fb в видеосекции
            const sdpLines = modifiedSdp.split('\r\n');
            let videoSection = false;
            const newSdpLines = [];
            for (let i = 0; i < sdpLines.length; i++) {
                const line = sdpLines[i];
                if (line.startsWith('m=video')) {
                    videoSection = true;
                } else if (line.startsWith('m=') && !line.startsWith('m=video')) {
                    videoSection = false;
                }
                // Пропускаем rtcp-fb только в видеосекции
                if (videoSection && line.startsWith('a=rtcp-fb')) {
                    continue;
                }
                newSdpLines.push(line);
            }

            // Формируем rtcp-fb только для VP8 и RTX
            const payloadsToKeep = [vp8Payload, rtxPayload].filter(Boolean);
            const rtcpFbLines = payloadsToKeep.flatMap(pt => [
                `a=rtcp-fb:${pt} ccm fir`,
                `a=rtcp-fb:${pt} nack`,
                `a=rtcp-fb:${pt} nack pli`
            ]);
            // Добавляем red и ulpfec без rtcp-fb
            payloadsToKeep.push('106', '108');

            // Обновляем m=video и добавляем rtcp-fb
            for (let i = 0; i < newSdpLines.length; i++) {
                if (newSdpLines[i].startsWith('m=video')) {
                    newSdpLines[i] = `m=video 9 UDP/TLS/RTP/SAVPF ${payloadsToKeep.join(' ')}`;
                    // Вставляем rtcp-fb после a=rtcp-rsize
                    const insertIndex = newSdpLines.indexOf('a=rtcp-rsize', i);
                    if (insertIndex !== -1) {
                        newSdpLines.splice(insertIndex + 1, 0, ...rtcpFbLines);
                    } else {
                        newSdpLines.splice(i + 1, 0, ...rtcpFbLines);
                    }
                    break;
                }
            }

            // Устанавливаем recvonly для видео
            for (let i = 0; i < newSdpLines.length; i++) {
                if (newSdpLines[i].startsWith('m=video')) {
                    // Удаляем старые направления
                    let j = i + 1;
                    while (newSdpLines[j] && (newSdpLines[j].startsWith('a=sendrecv') || newSdpLines[j].startsWith('a=sendonly') || newSdpLines[j].startsWith('a=recvonly'))) {
                        newSdpLines.splice(j, 1);
                    }
                    newSdpLines.splice(i + 1, 0, 'a=recvonly');
                    break;
                }
            }

            modifiedSdp = newSdpLines.join('\r\n');
            console.log(`Reordered m=video payloads to: ${payloadsToKeep.join(' ')}`);
            console.log('Set video direction to recvonly');
        }

        if (modifiedSdp.trim() === '') {
            console.error('Normalized SDP is empty, returning original SDP');
            return sdp;
        }

        console.log('Normalized SDP:', modifiedSdp);
        return modifiedSdp;
    };

    let cleanup = () => {
        console.log('Выполняется полная очистка ресурсов');

        // Очистка таймеров
        [connectionTimeout, statsInterval, videoCheckTimeout].forEach(timer => {
            if (timer.current) {
                clearTimeout(timer.current);
                timer.current = null;
            }
        });

        // Полная очистка PeerConnection
        if (pc.current) {
            console.log('Закрытие PeerConnection');
            // Отключаем все обработчики событий
            pc.current.onicecandidate = null;
            pc.current.ontrack = null;
            pc.current.onnegotiationneeded = null;
            pc.current.oniceconnectionstatechange = null;
            pc.current.onicegatheringstatechange = null;
            pc.current.onsignalingstatechange = null;
            pc.current.onconnectionstatechange = null;

            // Закрываем все трансцепторы
            pc.current.getTransceivers().forEach(transceiver => {
                try {
                    transceiver.stop();
                } catch (err) {
                    console.warn('Ошибка при остановке трансцептора:', err);
                }
            });

            // Закрываем соединение
            try {
                pc.current.close();
            } catch (err) {
                console.warn('Ошибка при закрытии PeerConnection:', err);
            }
            pc.current = null;
        }

        // Остановка и очистка медиапотоков
        [localStream, remoteStream].forEach(stream => {
            if (stream) {
                console.log(`Остановка ${stream === localStream ? 'локального' : 'удаленного'} потока`);
                stream.getTracks().forEach(track => {
                    try {
                        track.stop();
                        track.dispatchEvent(new Event('ended'));
                    } catch (err) {
                        console.warn('Ошибка при остановке трека:', err);
                    }
                });
            }
        });

        // Сброс состояний
        setLocalStream(null);
        setRemoteStream(null);
        pendingIceCandidates.current = [];
        isNegotiating.current = false;
        shouldCreateOffer.current = false;
        setIsCallActive(false);

        console.log('Очистка завершена');
    };


    const leaveRoom = () => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            try {
                ws.current.send(JSON.stringify({
                    type: 'leave',
                    room: roomId,
                    username
                }));
            } catch (e) {
                console.error('Error sending leave message:', e);
            }
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
                ws.current = new WebSocket('wss://ardua.site/wsgo');

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

                // Определяем preferredCodec, если он не хранится в состоянии
                const { isHuawei, isSafari, isIOS, isChrome } = detectPlatform();
                const preferredCodec = isHuawei || isSafari || isIOS ? 'H264' : 'VP8';

                switch (data.type) {
                    case 'room_info':
                        console.log('Room info received:', data);
                        const users = data.username ? [data.username] : [];
                        setUsers(users);
                        setIsLeader(data.isLeader === true && data.username === username);
                        break;

                    case 'switch_camera_ack':
                        console.log('Камера на Android успешно переключена');
                        break;

                    case 'reconnect_request':
                        console.log('Server requested reconnect');
                        setTimeout(() => resetConnection(), 1000);
                        break;

                    case 'force_disconnect':
                        console.log('Получена команда принудительного отключения');
                        setError('Вы были отключены, так как подключился другой зритель');
                        if (remoteStream) remoteStream.getTracks().forEach(track => track.stop());
                        if (pc.current) {
                            pc.current.close();
                            pc.current = null;
                        }
                        leaveRoom();
                        setRemoteStream(null);
                        setIsCallActive(false);
                        setIsInRoom(false);
                        break;

                    case 'offer':
                        console.log('Received offer:', JSON.stringify(data, null, 2));
                        if (pc.current && ws.current?.readyState === WebSocket.OPEN && data.sdp) {
                            try {
                                if (isNegotiating.current) {
                                    console.log('Уже в процессе переговоров, игнорируем оффер');
                                    return;
                                }
                                isNegotiating.current = true;
                                console.log('Setting remote description:', data.sdp);
                                await pc.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
                                const answer = await pc.current.createAnswer({
                                    offerToReceiveAudio: true,
                                    offerToReceiveVideo: true
                                });
                                console.log('Created answer:', answer);
                                const modifiedSdp = answer.sdp
                                    ? answer.sdp.replace('a=sendrecv\r\n', 'a=recvonly\r\n')
                                    : answer.sdp || '';
                                const normalizedAnswer = { ...answer, sdp: normalizeSdp(modifiedSdp, preferredCodec) };
                                console.log('Normalized answer SDP:', normalizedAnswer.sdp);
                                await pc.current.setLocalDescription(normalizedAnswer);
                                console.log('Sending answer:', JSON.stringify(normalizedAnswer, null, 2));
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
                        } else {
                            console.warn('Cannot process offer: PeerConnection or WebSocket not ready, or no SDP');
                        }
                        break;

                    case 'answer':
                        console.log('Received answer:', data);
                        if (pc.current && data.sdp) {
                            try {
                                if (pc.current.signalingState !== 'have-local-offer') {
                                    console.log('Не в состоянии have-local-offer, игнорируем ответ');
                                    return;
                                }
                                const answerDescription: RTCSessionDescriptionInit = {
                                    type: 'answer',
                                    sdp: normalizeSdp(data.sdp.sdp, preferredCodec)
                                };
                                await pc.current.setRemoteDescription(new RTCSessionDescription(answerDescription));
                                setIsCallActive(true);
                                startVideoCheckTimer();
                                while (pendingIceCandidates.current.length > 0) {
                                    const candidate = pendingIceCandidates.current.shift();
                                    if (candidate) await pc.current.addIceCandidate(candidate).catch(err =>
                                        console.error('Ошибка добавления отложенного ICE кандидата:', err));
                                }
                            } catch (err) {
                                console.error('Ошибка установки ответа:', err);
                                setError(`Ошибка установки ответа: ${err instanceof Error ? err.message : String(err)}`);
                            }
                        }
                        break;

                    case 'ice_candidate':
                        console.log('Received ICE candidate:', data);
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
                        break;

                    case 'error':
                        console.error('Server error:', data.data);
                        setError(data.data || 'Ошибка от сервера');
                        break;

                    default:
                        console.log('Unhandled message type:', data.type);
                }
            } catch (err) {
                console.error('Ошибка обработки сообщения:', err);
                setError('Ошибка обработки сообщения сервера');
            }
        };

        ws.current.onmessage = handleMessage;
    };

    const initializeWebRTC = async () => {
        try {
            cleanup();

            const { isIOS, isSafari, isHuawei } = detectPlatform();

            const config: RTCConfiguration = {
                iceServers: [
                    { urls: 'stun:ardua.site:3478' },
                    {
                        urls: 'turn:ardua.site:3478',
                        username: 'user1',
                        credential: 'pass1'
                    }
                ],
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require',
                iceTransportPolicy: 'all',
                iceCandidatePoolSize: 0,
                // @ts-ignore - sdpSemantics is supported but not in TypeScript's types
                sdpSemantics: 'unified-plan' as any,
            };

            pc.current = new RTCPeerConnection(config);


            if (isIOS || isSafari) {
                // iOS требует более агрессивного управления ICE
                pc.current.oniceconnectionstatechange = () => {
                    if (!pc.current) return;

                    console.log('iOS ICE state:', pc.current.iceConnectionState);

                    if (pc.current.iceConnectionState === 'disconnected' ||
                        pc.current.iceConnectionState === 'failed') {
                        console.log('iOS: ICE failed, restarting connection');
                        setTimeout(resetConnection, 1000);
                    }
                };

                // iOS требует быстрой переотправки кандидатов
                pc.current.onicegatheringstatechange = () => {
                    if (pc.current?.iceGatheringState === 'complete') {
                        console.log('iOS: ICE gathering complete');
                    }
                };
            }

            pc.current.addEventListener('icecandidate', event => {
                if (event.candidate) {
                    console.log('Using candidate type:',
                        event.candidate.candidate.split(' ')[7]);
                }
            });

            if (isHuawei) {
                pc.current.oniceconnectionstatechange = () => {
                    if (!pc.current) return;

                    console.log('Huawei ICE состояние:', pc.current.iceConnectionState);

                    // Более агрессивное восстановление для Huawei
                    if (pc.current.iceConnectionState === 'disconnected' ||
                        pc.current.iceConnectionState === 'failed') {
                        console.log('Huawei: соединение прервано, переподключение...');
                        setTimeout(resetConnection, 1000);
                    }
                };
            }

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
                    ...getVideoConstraints(),
                    ...(isIOS && !deviceIds.video ? { facingMode: 'user' } : {})
                } : getVideoConstraints(),
                ...(isIOS && !deviceIds.video ? { facingMode: 'user' } : {}),
                audio: deviceIds.audio ? {
                    deviceId: { exact: deviceIds.audio },
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } : true
            });

            // Применяем настройки для Huawei
            pc.current.getSenders().forEach(configureVideoSender);

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
                        if (shouldSendIceCandidate(event.candidate)) {
                            ws.current.send(JSON.stringify({
                                type: 'ice_candidate',
                                ice: event.candidate.toJSON(),
                                room: roomId,
                                username
                            }));
                        }
                    } catch (err) {
                        console.error('Ошибка отправки ICE кандидата:', err);
                    }
                }
            };

            const shouldSendIceCandidate = (candidate: RTCIceCandidate) => {

                const { isIOS, isSafari, isHuawei } = detectPlatform();

                // Для Huawei отправляем только relay-кандидаты
                if (isHuawei) {
                    return candidate.candidate.includes('typ relay');
                }

                // Для iOS/Safari отправляем только relay-кандидаты и srflx
                if (isIOS || isSafari) {
                    return candidate.candidate.includes('typ relay') ||
                        candidate.candidate.includes('typ srflx');
                }

                return true;
            };

            // Обработка входящих медиапотоков
            pc.current.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    const stream = event.streams[0];

                    // Проверяем наличие видео трека
                    const videoTrack = stream.getVideoTracks()[0];
                    if (videoTrack) {
                        console.log('Получен видеотрек:', videoTrack.id);

                        // Создаем новый MediaStream только с нужными треками
                        const newRemoteStream = new MediaStream();
                        stream.getTracks().forEach(track => {
                            newRemoteStream.addTrack(track);
                            console.log(`Добавлен ${track.kind} трек в remoteStream`);
                        });

                        setRemoteStream(newRemoteStream);
                        setIsCallActive(true);

                        // Очищаем таймер проверки видео
                        if (videoCheckTimeout.current) {
                            clearTimeout(videoCheckTimeout.current);
                            videoCheckTimeout.current = null;
                        }
                    } else {
                        console.warn('Входящий поток не содержит видео');
                        startVideoCheckTimer();
                    }
                }
            };

            // Обработка состояния ICE соединения
            pc.current.oniceconnectionstatechange = () => {
                if (!pc.current) return;

                const { isHuawei } = detectPlatform();

                if (pc.current.iceConnectionState === 'connected' && isHuawei) {
                    // Сохраняем функцию остановки для cleanup
                    const stopHuaweiMonitor = startHuaweiPerformanceMonitor();

                    // Автоматическая остановка при разрыве
                    pc.current.onconnectionstatechange = () => {
                        if (pc.current?.connectionState === 'disconnected') {
                            stopHuaweiMonitor();
                        }
                    };

                    // Также останавливаем при ручной очистке
                    const originalCleanup = cleanup;
                    cleanup = () => {
                        stopHuaweiMonitor();
                        originalCleanup();
                    };
                }

                if (isHuawei && pc.current.iceConnectionState === 'disconnected') {
                    // Более агрессивный перезапуск для Huawei
                    setTimeout(resetConnection, 1000);
                }

                console.log('Состояние ICE соединения:', pc.current.iceConnectionState);

                switch (pc.current.iceConnectionState) {
                    case 'failed':
                        console.log('Ошибка ICE, перезапуск...');
                        resetConnection();
                        break;

                    case 'disconnected':
                        console.log('Соединение прервано...');
                        setIsCallActive(false);
                        resetConnection();
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

    const adjustVideoQualityForSafari = (direction: 'higher' | 'lower') => {
        const senders = pc.current?.getSenders() || [];

        senders.forEach(sender => {
            if (sender.track?.kind === 'video') {
                const parameters = sender.getParameters();

                if (!parameters.encodings) return;

                parameters.encodings[0] = {
                    ...parameters.encodings[0],
                    maxBitrate: direction === 'higher' ? 300000 : 150000,
                    scaleResolutionDownBy: direction === 'higher' ? 1.0 : 1.5,
                    maxFramerate: direction === 'higher' ? 25 : 15,
                    priority: 'high',
                    networkPriority: 'high'
                };

                try {
                    sender.setParameters(parameters);
                } catch (err) {
                    console.error('Ошибка изменения параметров:', err);
                }
            }
        });
    };

    const startConnectionMonitoring = () => {
        if (statsInterval.current) {
            clearInterval(statsInterval.current);
        }

        const { isSafari } = detectPlatform();

        statsInterval.current = setInterval(async () => {
            if (!pc.current || !isCallActive) return;

            try {
                const stats = await pc.current.getStats();
                let hasActiveVideo = false;
                let packetsLost = 0;
                let totalPackets = 0;
                let videoJitter = 0;

                stats.forEach(report => {
                    if (report.type === 'inbound-rtp' && report.kind === 'video') {
                        if (report.bytesReceived > 0) hasActiveVideo = true;
                        if (report.packetsLost !== undefined) packetsLost += report.packetsLost;
                        if (report.packetsReceived !== undefined) totalPackets += report.packetsReceived;
                        if (report.jitter !== undefined) videoJitter = report.jitter;
                    }
                });

                // Общая проверка для всех устройств
                if (!hasActiveVideo && isCallActive) {
                    console.warn('Нет активного видеопотока, пытаемся восстановить...');
                    resetConnection();
                    return;
                }

                // Специфичные проверки для Safari
                if (isSafari) {
                    // Проверка на высокую задержку
                    if (videoJitter > 0.3) { // Jitter в секундах
                        console.log('Высокий jitter на Safari, уменьшаем битрейт');
                        adjustVideoQualityForSafari('lower');
                    }
                    // Проверка потери пакетов
                    else if (totalPackets > 0 && packetsLost / totalPackets > 0.05) { // >5% потерь
                        console.warn('Высокий уровень потерь пакетов на Safari, переподключение...');
                        resetConnection();
                        return;
                    }
                }
            } catch (err) {
                console.error('Ошибка получения статистики:', err);
            }
        }, 5000);

        return () => {
            if (statsInterval.current) {
                clearInterval(statsInterval.current);
            }
        };
    };

// Модифицируем функцию resetConnection
    const resetConnection = async () => {
        if (retryAttempts.current >= MAX_RETRIES) {
            setError('Не удалось восстановить соединение после нескольких попыток');
            leaveRoom();
            return;
        }

        // Увеличиваем таймаут с каждой попыткой, особенно для мобильных
        const { isIOS, isSafari } = detectPlatform();
        const baseDelay = isIOS || isSafari ? 5000 : 2000; // Больше времени для iOS
        const retryDelay = Math.min(baseDelay * (retryAttempts.current + 1), 15000);

        console.log(`Попытка переподключения #${retryAttempts.current + 1}, задержка: ${retryDelay}ms`);

        cleanup();
        retryAttempts.current += 1;
        setRetryCount(retryAttempts.current);

        setTimeout(async () => {
            try {
                await joinRoom(username);
                retryAttempts.current = 0;
            } catch (err) {
                console.error('Ошибка переподключения:', err);
                if (retryAttempts.current < MAX_RETRIES) {
                    resetConnection();
                }
            }
        }, retryDelay);
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
        setIsLeader(false);

        try {
            // Определяем платформу и выбираем предпочтительный кодек
            const { isHuawei, isSafari, isIOS, isChrome } = detectPlatform();
            let preferredCodec: string;

            if (isHuawei) {
                preferredCodec = 'H264'; // Huawei всегда использует H.264
            } else if (isSafari || isIOS) {
                preferredCodec = 'H264'; // Safari/iOS используют H.264
            } else if (isChrome) {
                preferredCodec = 'VP8';  // Chrome использует VP8
            } else {
                preferredCodec = 'H264'; // По умолчанию H.264
            }
            console.log("Selected preferredCodec:", preferredCodec);

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
                        console.log("Received WebSocket message:", data);
                        if (data.type === 'room_info') {
                            console.log("Room info received:", data);
                            cleanupEvents();
                            resolve();
                        } else if (data.type === 'error') {
                            console.error("Server error:", data.data);
                            cleanupEvents();
                            reject(new Error(data.data || 'Ошибка входа в комнату'));
                        } else {
                            console.log("Unhandled message type:", data.type);
                        }
                    } catch (err) {
                        console.error("Error parsing WebSocket message:", err);
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
                    reject(new Error('Таймаут ожидания ответа от сервера'));
                }, 10000);

                ws.current.addEventListener('message', onMessage);

                const joinMessage = {
                    action: "join",
                    room: roomId,
                    username: uniqueUsername,
                    isLeader: false,
                    preferredCodec
                };
                console.log("Sending join message:", joinMessage);
                ws.current.send(JSON.stringify(joinMessage));
            });

            // 4. Успешное подключение
            setIsInRoom(true);
            shouldCreateOffer.current = false;

            // 5. Запускаем таймер проверки видео
            startVideoCheckTimer();

        } catch (err) {
            console.error('Ошибка входа в комнату:', err);
            setError(`Ошибка входа в комнату: ${err instanceof Error ? err.message : String(err)}`);

            cleanup();
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }

            if (retryAttempts.current < MAX_RETRIES) {
                retryAttempts.current += 1;
                setTimeout(() => {
                    joinRoom(uniqueUsername).catch(console.error);
                }, 2000 * retryAttempts.current);
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
        isLeader,
        error,
        retryCount,
        resetConnection,
        restartMediaDevices,
        ws: ws.current, // Возвращаем текущее соединение
    };
};