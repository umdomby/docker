// file: docker-ardua/components/webrtc/VideoCallApp.tsx
'use client'

import { useWebRTC } from './hooks/useWebRTC';
import styles from './styles.module.css';
import { VideoPlayer } from './components/VideoPlayer';
import { DeviceSelector } from './components/DeviceSelector';
import { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export const VideoCallApp = () => {
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDevices, setSelectedDevices] = useState({
        video: '',
        audio: ''
    });
    const [roomId, setRoomId] = useState('room1');
    const [username, setUsername] = useState('123');
    const [hasPermission, setHasPermission] = useState(false);
    const [devicesLoaded, setDevicesLoaded] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [autoJoin, setAutoJoin] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [videoRotation, setVideoRotation] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const videoContainerRef = useRef<HTMLDivElement>(null);

    const {
        localStream,
        remoteStream,
        users,
        joinRoom,
        leaveRoom,
        isCallActive,
        isConnected,
        isInRoom,
        error
    } = useWebRTC(selectedDevices, username, roomId);

    const loadDevices = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            stream.getTracks().forEach(track => track.stop());

            const devices = await navigator.mediaDevices.enumerateDevices();
            setDevices(devices);
            setHasPermission(true);
            setDevicesLoaded(true);

            const savedVideoDevice = localStorage.getItem('videoDevice');
            const savedAudioDevice = localStorage.getItem('audioDevice');

            const videoDevice = devices.find(d =>
                d.kind === 'videoinput' &&
                (savedVideoDevice ? d.deviceId === savedVideoDevice : true)
            );
            const audioDevice = devices.find(d =>
                d.kind === 'audioinput' &&
                (savedAudioDevice ? d.deviceId === savedAudioDevice : true)
            );

            setSelectedDevices({
                video: videoDevice?.deviceId || '',
                audio: audioDevice?.deviceId || ''
            });
        } catch (error) {
            console.error('Device access error:', error);
            setHasPermission(false);
            setDevicesLoaded(true);
        }
    };

    useEffect(() => {
        const savedAutoJoin = localStorage.getItem('autoJoin') === 'true';
        setAutoJoin(savedAutoJoin);
        loadDevices();
    }, []);

    useEffect(() => {
        if (autoJoin && hasPermission && devicesLoaded && selectedDevices.video && selectedDevices.audio) {
            joinRoom(username);
        }
    }, [autoJoin, hasPermission, devicesLoaded, selectedDevices]);

    useEffect(() => {
        if (selectedDevices.video) {
            localStorage.setItem('videoDevice', selectedDevices.video);
        }
        if (selectedDevices.audio) {
            localStorage.setItem('audioDevice', selectedDevices.audio);
        }
    }, [selectedDevices]);

    const handleDeviceChange = (type: 'video' | 'audio', deviceId: string) => {
        setSelectedDevices(prev => ({
            ...prev,
            [type]: deviceId
        }));
    };

    const handleJoinRoom = async () => {
        setIsJoining(true);
        try {
            await joinRoom(username);
        } catch (error) {
            console.error('Error joining room:', error);
        } finally {
            setIsJoining(false);
        }
    };

    const toggleFullscreen = async () => {
        if (!videoContainerRef.current) return;

        try {
            if (!document.fullscreenElement) {
                await videoContainerRef.current.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error('Fullscreen error:', err);
        }
    };

    const rotateVideo = (degrees: number) => {
        setVideoRotation(degrees);
    };

    const flipVideo = () => {
        setIsFlipped(!isFlipped);
    };

    const resetVideo = () => {
        setVideoRotation(0);
        setIsFlipped(false);
    };

    // Обработчик изменения полноэкранного режима
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    return (
        <div className={styles.container}>
            {/* Основное видео (удаленный участник) */}
            <div
                ref={videoContainerRef}
                className={`${styles.remoteVideoContainer} ${styles[videoRotation]}`}
                style={{
                    transform: `scaleX(${isFlipped ? -1 : 1})`
                }}
            >
                <VideoPlayer
                    stream={remoteStream}
                    className={styles.remoteVideo}
                />
                <div className={styles.remoteVideoLabel}>Удаленный участник</div>
            </div>

            {/* Локальное видео (маленькое в углу) */}
            <div className={styles.localVideoContainer}>
                <VideoPlayer
                    stream={localStream}
                    muted
                    className={styles.localVideo}
                />
                <div className={styles.localVideoLabel}>Вы ({username})</div>
            </div>

            {/* Панель управления сверху */}
            <div className={styles.topControls}>
                <button
                    onClick={() => setShowControls(!showControls)}
                    className={styles.toggleControlsButton}
                >
                    {showControls ? '▲' : '▼'} Управление
                </button>

                <div className={styles.videoControls}>
                    <button
                        onClick={() => rotateVideo(0)}
                        className={`${styles.controlButton} ${videoRotation === 0 ? styles.active : ''}`}
                        title="Обычная ориентация"
                    >
                        ↻0°
                    </button>
                    <button
                        onClick={() => rotateVideo(90)}
                        className={`${styles.controlButton} ${videoRotation === 90 ? styles.active : ''}`}
                        title="Повернуть на 90°"
                    >
                        ↻90°
                    </button>
                    <button
                        onClick={() => rotateVideo(180)}
                        className={`${styles.controlButton} ${videoRotation === 180 ? styles.active : ''}`}
                        title="Повернуть на 180°"
                    >
                        ↻180°
                    </button>
                    <button
                        onClick={() => rotateVideo(270)}
                        className={`${styles.controlButton} ${videoRotation === 270 ? styles.active : ''}`}
                        title="Повернуть на 270°"
                    >
                        ↻270°
                    </button>
                    <button
                        onClick={flipVideo}
                        className={`${styles.controlButton} ${isFlipped ? styles.active : ''}`}
                        title="Отразить по горизонтали"
                    >
                        ⇄
                    </button>
                    <button
                        onClick={resetVideo}
                        className={styles.controlButton}
                        title="Сбросить настройки"
                    >
                        ⟲
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className={styles.controlButton}
                        title={document.fullscreenElement ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
                    >
                        {document.fullscreenElement ? '✕' : '⛶'}
                    </button>
                </div>
            </div>

            {/* Контролы (скрываемые) */}
            {showControls && (
                <div className={styles.controlsOverlay}>
                    {error && <div className={styles.error}>{error}</div>}
                    <div className={styles.controls}>
                        {/* ... остальные элементы управления ... */}
                    </div>
                </div>
            )}
        </div>
    );
};