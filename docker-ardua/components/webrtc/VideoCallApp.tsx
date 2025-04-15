// file: docker-ardua/components/webrtc/VideoCallApp.tsx
'use client'

import { useWebRTC } from './hooks/useWebRTC';
import styles from './styles.module.css';
import { VideoPlayer } from './components/VideoPlayer';
import { DeviceSelector } from './components/DeviceSelector';
import { useEffect, useState } from 'react';
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
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [videoRotation, setVideoRotation] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

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

    const toggleFullscreen = () => {
        const videoContainer = document.querySelector(`.${styles.remoteVideoContainer}`);
        if (!videoContainer) return;

        if (!isFullscreen) {
            if (videoContainer.requestFullscreen) {
                videoContainer.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
        setIsFullscreen(!isFullscreen);
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

    return (
        <div className={styles.container}>
            {/* Основное видео (удаленный участник) */}
            <div
                className={`${styles.remoteVideoContainer} ${isFullscreen ? styles.fullscreen : ''}`}
                style={{
                    transform: `rotate(${videoRotation}deg) scaleX(${isFlipped ? -1 : 1})`
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
                    {isFullscreen && (
                        <>
                            <button
                                onClick={() => rotateVideo(0)}
                                className={styles.controlButton}
                                title="Обычная ориентация"
                            >
                                ↻0°
                            </button>
                            <button
                                onClick={() => rotateVideo(90)}
                                className={styles.controlButton}
                                title="Повернуть на 90°"
                            >
                                ↻90°
                            </button>
                            <button
                                onClick={() => rotateVideo(180)}
                                className={styles.controlButton}
                                title="Повернуть на 180°"
                            >
                                ↻180°
                            </button>
                            <button
                                onClick={() => rotateVideo(270)}
                                className={styles.controlButton}
                                title="Повернуть на 270°"
                            >
                                ↻270°
                            </button>
                            <button
                                onClick={flipVideo}
                                className={styles.controlButton}
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
                        </>
                    )}
                    <button
                        onClick={toggleFullscreen}
                        className={styles.controlButton}
                        title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
                    >
                        {isFullscreen ? '✕' : '⛶'}
                    </button>
                </div>
            </div>

            {/* Контролы (скрываемые) */}
            {showControls && (
                <div className={styles.controlsOverlay}>
                    {error && <div className={styles.error}>{error}</div>}
                    <div className={styles.controls}>
                        <div className={styles.connectionStatus}>
                            Статус: {isConnected ? (isInRoom ? `В комнате ${roomId}` : 'Подключено') : 'Отключено'}
                            {isCallActive && ' (Звонок активен)'}
                        </div>

                        <div className={styles.inputGroup}>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="autoJoin"
                                    checked={autoJoin}
                                    onCheckedChange={(checked) => {
                                        setAutoJoin(!!checked);
                                        localStorage.setItem('autoJoin', checked ? 'true' : 'false');
                                    }}
                                />
                                <label
                                    htmlFor="autoJoin"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Автоматическое подключение
                                </label>
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <Input
                                id="room"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                disabled={isInRoom}
                                placeholder="ID комнаты"
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <Input
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isInRoom}
                                placeholder="Ваше имя"
                            />
                        </div>

                        {!isInRoom ? (
                            <Button
                                onClick={handleJoinRoom}
                                disabled={!hasPermission || isJoining || (autoJoin && isInRoom)}
                                className={styles.button}
                            >
                                {isJoining ? 'Подключение...' : 'Войти в комнату'}
                            </Button>
                        ) : (
                            <Button
                                onClick={leaveRoom}
                                className={styles.button}
                            >
                                Покинуть комнату
                            </Button>
                        )}

                        <div className={styles.userList}>
                            <h3>Участники ({users.length}):</h3>
                            <ul>
                                {users.map((user, index) => (
                                    <li key={index}>{user}</li>
                                ))}
                            </ul>
                        </div>

                        <div className={styles.deviceSelection}>
                            <h3>Выбор устройств:</h3>
                            {devicesLoaded ? (
                                <DeviceSelector
                                    devices={devices}
                                    selectedDevices={selectedDevices}
                                    onChange={handleDeviceChange}
                                    onRefresh={loadDevices}
                                />
                            ) : (
                                <div>Загрузка устройств...</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};