// file: docker-ardua/components/webrtc/VideoCallApp.tsx
'use client'

import { useWebRTC } from './hooks/useWebRTC'
import styles from './styles.module.css'
import { VideoPlayer } from './components/VideoPlayer'
import { DeviceSelector } from './components/DeviceSelector'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

export const VideoCallApp = () => {
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
    const [selectedDevices, setSelectedDevices] = useState({
        video: '',
        audio: ''
    })
    const [roomId, setRoomId] = useState('room1')
    const [username, setUsername] = useState('user_' + Math.floor(Math.random() * 1000))
    const [hasPermission, setHasPermission] = useState(false)
    const [devicesLoaded, setDevicesLoaded] = useState(false)
    const [isJoining, setIsJoining] = useState(false)
    const [autoJoin, setAutoJoin] = useState(false)
    const [showControls, setShowControls] = useState(false)
    const [videoRotation, setVideoRotation] = useState(0)
    const [isFlippedHorizontal, setIsFlippedHorizontal] = useState(false)
    const [isFlippedVertical, setIsFlippedVertical] = useState(false)
    const videoContainerRef = useRef<HTMLDivElement>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)

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
    } = useWebRTC(selectedDevices, username, roomId)

    // Загрузка сохраненных настроек
    const loadSettings = useCallback(() => {
        const savedSettings = localStorage.getItem('videoSettings')
        if (savedSettings) {
            try {
                const { rotation = 0, flipH = false, flipV = false } = JSON.parse(savedSettings)
                setVideoRotation(rotation)
                setIsFlippedHorizontal(flipH)
                setIsFlippedVertical(flipV)
            } catch (e) {
                console.error('Error parsing video settings', e)
            }
        }
    }, [])

    // Сохранение настроек
    const saveSettings = useCallback(() => {
        const settings = {
            rotation: videoRotation,
            flipH: isFlippedHorizontal,
            flipV: isFlippedVertical
        }
        localStorage.setItem('videoSettings', JSON.stringify(settings))
    }, [videoRotation, isFlippedHorizontal, isFlippedVertical])

    const loadDevices = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            })

            stream.getTracks().forEach(track => track.stop())

            const devices = await navigator.mediaDevices.enumerateDevices()
            setDevices(devices)
            setHasPermission(true)
            setDevicesLoaded(true)

            const savedVideoDevice = localStorage.getItem('videoDevice')
            const savedAudioDevice = localStorage.getItem('audioDevice')

            const videoDevice = devices.find(d =>
                d.kind === 'videoinput' &&
                (savedVideoDevice ? d.deviceId === savedVideoDevice : true)
            )
            const audioDevice = devices.find(d =>
                d.kind === 'audioinput' &&
                (savedAudioDevice ? d.deviceId === savedAudioDevice : true)
            )

            setSelectedDevices({
                video: videoDevice?.deviceId || '',
                audio: audioDevice?.deviceId || ''
            })
        } catch (error) {
            console.error('Device access error:', error)
            setHasPermission(false)
            setDevicesLoaded(true)
        }
    }

    useEffect(() => {
        const savedAutoJoin = localStorage.getItem('autoJoin') === 'true'
        setAutoJoin(savedAutoJoin)
        loadSettings()
        loadDevices()

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
        }
    }, [loadSettings])

    useEffect(() => {
        if (autoJoin && hasPermission && devicesLoaded && selectedDevices.video && selectedDevices.audio) {
            joinRoom(username)
        }
    }, [autoJoin, hasPermission, devicesLoaded, selectedDevices])

    useEffect(() => {
        if (selectedDevices.video) localStorage.setItem('videoDevice', selectedDevices.video)
        if (selectedDevices.audio) localStorage.setItem('audioDevice', selectedDevices.audio)
    }, [selectedDevices])

    useEffect(() => {
        saveSettings()
    }, [videoRotation, isFlippedHorizontal, isFlippedVertical, saveSettings])

    const handleDeviceChange = (type: 'video' | 'audio', deviceId: string) => {
        setSelectedDevices(prev => ({
            ...prev,
            [type]: deviceId
        }))
    }

    const handleJoinRoom = async () => {
        setIsJoining(true)
        try {
            await joinRoom(username)
        } catch (error) {
            console.error('Error joining room:', error)
        } finally {
            setIsJoining(false)
        }
    }

    const toggleFullscreen = async () => {
        if (!videoContainerRef.current) return

        try {
            if (!document.fullscreenElement) {
                await videoContainerRef.current.requestFullscreen()
            } else {
                await document.exitFullscreen()
            }
        } catch (err) {
            console.error('Fullscreen error:', err)
        }
    }

    const rotateVideo = (degrees: number) => {
        setVideoRotation(degrees)
    }

    const flipVideoHorizontal = () => {
        setIsFlippedHorizontal(!isFlippedHorizontal)
    }

    const flipVideoVertical = () => {
        setIsFlippedVertical(!isFlippedVertical)
    }

    const resetVideo = () => {
        setVideoRotation(0)
        setIsFlippedHorizontal(false)
        setIsFlippedVertical(false)
    }

    const getTransformStyle = useCallback(() => {
        let transform = ''

        // Поворот
        if (videoRotation !== 0) {
            transform += `rotate(${videoRotation}deg) `
        }

        // Отражения
        transform += `scaleX(${isFlippedHorizontal ? -1 : 1}) `
        transform += `scaleY(${isFlippedVertical ? -1 : 1})`

        return transform
    }, [videoRotation, isFlippedHorizontal, isFlippedVertical])

    return (
        <div className={styles.container}>
            {/* Основное видео (удаленный участник) */}
            <div
                ref={videoContainerRef}
                className={styles.remoteVideoContainer}
                style={{
                    transform: getTransformStyle(),
                    transformOrigin: 'center center'
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
                        onClick={flipVideoHorizontal}
                        className={`${styles.controlButton} ${isFlippedHorizontal ? styles.active : ''}`}
                        title="Отразить по горизонтали"
                    >
                        ⇄
                    </button>
                    <button
                        onClick={flipVideoVertical}
                        className={`${styles.controlButton} ${isFlippedVertical ? styles.active : ''}`}
                        title="Отразить по вертикали"
                    >
                        ⇅
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
                                        setAutoJoin(!!checked)
                                        localStorage.setItem('autoJoin', checked ? 'true' : 'false')
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
    )
}