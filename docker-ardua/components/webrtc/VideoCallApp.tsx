// file: docker-ardua/components/webrtc/VideoCallApp.tsx
'use client'

import { useWebRTC } from './hooks/useWebRTC'
import styles from './styles.module.css'
import { VideoPlayer } from './components/VideoPlayer'
import { DeviceSelector } from './components/DeviceSelector'
import { useEffect, useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import SocketClient from '../control/SocketClient'

type VideoSettings = {
    rotation: number
    flipH: boolean
    flipV: boolean
}

export const VideoCallApp = () => {
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
    const [selectedDevices, setSelectedDevices] = useState({
        video: '',
        audio: ''
    })
    const [showLocalVideo, setShowLocalVideo] = useState(true)
    const [videoTransform, setVideoTransform] = useState('')
    const [roomId, setRoomId] = useState('room1')
    const [username, setUsername] = useState('user_' + Math.floor(Math.random() * 1000))
    const [hasPermission, setHasPermission] = useState(false)
    const [devicesLoaded, setDevicesLoaded] = useState(false)
    const [isJoining, setIsJoining] = useState(false)
    const [autoJoin, setAutoJoin] = useState(false)
    const [activeTab, setActiveTab] = useState<'webrtc' | 'esp' | 'controls' | null>('esp')
    const [videoSettings, setVideoSettings] = useState<VideoSettings>({
        rotation: 0,
        flipH: false,
        flipV: false
    })
    const [muteLocalAudio, setMuteLocalAudio] = useState(false)
    const [muteRemoteAudio, setMuteRemoteAudio] = useState(false)
    const videoContainerRef = useRef<HTMLDivElement>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const remoteVideoRef = useRef<HTMLVideoElement>(null)
    const localAudioTracks = useRef<MediaStreamTrack[]>([])

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

    // Загрузка настроек из localStorage
    useEffect(() => {
        const savedMuteLocal = localStorage.getItem('muteLocalAudio')
        if (savedMuteLocal !== null) {
            setMuteLocalAudio(savedMuteLocal === 'true')
        }

        const savedMuteRemote = localStorage.getItem('muteRemoteAudio')
        if (savedMuteRemote !== null) {
            setMuteRemoteAudio(savedMuteRemote === 'true')
        }

        const savedShowLocalVideo = localStorage.getItem('showLocalVideo')
        if (savedShowLocalVideo !== null) {
            setShowLocalVideo(savedShowLocalVideo === 'true')
        }

        const savedAutoJoin = localStorage.getItem('autoJoin') === 'true'
        setAutoJoin(savedAutoJoin)
        loadSettings()
        loadDevices()
    }, [])

    // Управление локальным звуком
    useEffect(() => {
        if (localStream) {
            localAudioTracks.current = localStream.getAudioTracks()
            localAudioTracks.current.forEach(track => {
                track.enabled = !muteLocalAudio
            })
        }
    }, [localStream, muteLocalAudio])

    // Управление удаленным звуком
    useEffect(() => {
        if (remoteStream) {
            remoteStream.getAudioTracks().forEach(track => {
                track.enabled = !muteRemoteAudio
            })
        }
    }, [remoteStream, muteRemoteAudio])

    useEffect(() => {
        if (autoJoin && hasPermission && !isInRoom) {
            handleJoinRoom();
        }
    }, [autoJoin, hasPermission]); // Зависимости

    const loadSettings = () => {
        try {
            const saved = localStorage.getItem('videoSettings')
            if (saved) {
                const parsed = JSON.parse(saved) as VideoSettings
                setVideoSettings(parsed)
                applyVideoTransform(parsed)
            }
        } catch (e) {
            console.error('Failed to load video settings', e)
        }
    }

    const saveSettings = (settings: VideoSettings) => {
        localStorage.setItem('videoSettings', JSON.stringify(settings))
    }

    const applyVideoTransform = (settings: VideoSettings) => {
        const { rotation, flipH, flipV } = settings
        let transform = ''
        if (rotation !== 0) transform += `rotate(${rotation}deg) `
        transform += `scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`
        setVideoTransform(transform)

        if (remoteVideoRef.current) {
            remoteVideoRef.current.style.transform = transform
            remoteVideoRef.current.style.transformOrigin = 'center center'
        }
    }

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

            setSelectedDevices({
                video: savedVideoDevice || '',
                audio: savedAudioDevice || ''
            })
        } catch (error) {
            console.error('Device access error:', error)
            setHasPermission(false)
            setDevicesLoaded(true)
        }
    }

    const toggleLocalVideo = () => {
        const newState = !showLocalVideo
        setShowLocalVideo(newState)
        localStorage.setItem('showLocalVideo', String(newState))
    }

    const updateVideoSettings = (newSettings: Partial<VideoSettings>) => {
        const updated = { ...videoSettings, ...newSettings }
        setVideoSettings(updated)
        applyVideoTransform(updated)
        saveSettings(updated)
    }

    const handleDeviceChange = (type: 'video' | 'audio', deviceId: string) => {
        setSelectedDevices(prev => ({
            ...prev,
            [type]: deviceId
        }))
        localStorage.setItem(`${type}Device`, deviceId)
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

    const toggleMuteLocalAudio = () => {
        const newState = !muteLocalAudio
        setMuteLocalAudio(newState)
        localStorage.setItem('muteLocalAudio', String(newState))

        localAudioTracks.current.forEach(track => {
            track.enabled = !newState
        })
    }

    const toggleMuteRemoteAudio = () => {
        const newState = !muteRemoteAudio
        setMuteRemoteAudio(newState)
        localStorage.setItem('muteRemoteAudio', String(newState))

        if (remoteStream) {
            remoteStream.getAudioTracks().forEach(track => {
                track.enabled = !newState
            })
        }
    }

    const rotateVideo = (degrees: number) => {
        updateVideoSettings({ rotation: degrees })
    }

    const flipVideoHorizontal = () => {
        updateVideoSettings({ flipH: !videoSettings.flipH })
    }

    const flipVideoVertical = () => {
        updateVideoSettings({ flipV: !videoSettings.flipV })
    }

    const resetVideo = () => {
        updateVideoSettings({ rotation: 0, flipH: false, flipV: false })
    }

    const toggleTab = (tab: 'webrtc' | 'esp' | 'controls') => {
        setActiveTab(activeTab === tab ? null : tab)
    }

    return (
        <div className={styles.container}>
            <div ref={videoContainerRef} className={styles.remoteVideoContainer}>
                <VideoPlayer
                    stream={remoteStream}
                    className={styles.remoteVideo}
                    transform={videoTransform}
                />
            </div>

            {showLocalVideo && (
                <div className={styles.localVideoContainer}>
                    <VideoPlayer
                        stream={localStream}
                        muted
                        className={styles.localVideo}
                    />
                </div>
            )}

            <div className={styles.topControls}>
                <div className={styles.tabsContainer}>
                    <button
                        onClick={() => toggleTab('webrtc')}
                        className={`${styles.tabButton} ${activeTab === 'webrtc' ? styles.activeTab : ''}`}
                    >
                        {activeTab === 'webrtc' ? '▲' : '▼'} <img src="/cam.svg" alt="Camera" />
                    </button>
                    <button
                        onClick={() => toggleTab('esp')}
                        className={`${styles.tabButton} ${activeTab === 'esp' ? styles.activeTab : ''}`}
                    >
                        {activeTab === 'esp' ? '▲' : '▼'} <img src="/joy.svg" alt="Joystick" />
                    </button>
                    <button
                        onClick={() => toggleTab('controls')}
                        className={`${styles.tabButton} ${activeTab === 'controls' ? styles.activeTab : ''}`}
                    >
                        {activeTab === 'controls' ? '▲' : '▼'} <img src="/img.svg" alt="Image" />
                    </button>
                </div>
            </div>

            {activeTab === 'webrtc' && (
                <div className={styles.tabContent}>
                    {error && <div className={styles.error}>{error}</div>}
                    <div className={styles.controls}>
                        <div className={styles.connectionStatus}>
                            Статус: {isConnected ? (isInRoom ? `В комнате ${roomId}` : 'Подключено') : 'Отключено'}
                            {isCallActive && ' (Звонок активен)'}
                            {users.length > 0 && (
                                <div>
                                    Роль: {users[0] === username ? "Ведущий" : "Ведомый"}
                                </div>
                            )}
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
                                <Label htmlFor="autoJoin">Автоматическое подключение</Label>
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
                                disabled={!hasPermission || isJoining}
                                className={styles.button}
                            >
                                {isJoining ? 'Подключение...' : 'Войти в комнату'}
                            </Button>
                        ) : (
                            <Button onClick={leaveRoom} className={styles.button}>
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

            {activeTab === 'esp' && (
                <div className={styles.tabContent}>
                    <SocketClient/>
                </div>
            )}

            {activeTab === 'controls' && (
                <div className={styles.tabContent}>
                    <div className={styles.videoControlsTab}>
                        <div className={styles.controlButtons}>
                            <button
                                onClick={() => rotateVideo(0)}
                                className={`${styles.controlButton} ${videoSettings.rotation === 0 ? styles.active : ''}`}
                                title="Обычная ориентация"
                            >
                                ↻0°
                            </button>
                            <button
                                onClick={() => rotateVideo(90)}
                                className={`${styles.controlButton} ${videoSettings.rotation === 90 ? styles.active : ''}`}
                                title="Повернуть на 90°"
                            >
                                ↻90°
                            </button>
                            <button
                                onClick={() => rotateVideo(180)}
                                className={`${styles.controlButton} ${videoSettings.rotation === 180 ? styles.active : ''}`}
                                title="Повернуть на 180°"
                            >
                                ↻180°
                            </button>
                            <button
                                onClick={() => rotateVideo(270)}
                                className={`${styles.controlButton} ${videoSettings.rotation === 270 ? styles.active : ''}`}
                                title="Повернуть на 270°"
                            >
                                ↻270°
                            </button>
                            <button
                                onClick={flipVideoHorizontal}
                                className={`${styles.controlButton} ${videoSettings.flipH ? styles.active : ''}`}
                                title="Отразить по горизонтали"
                            >
                                ⇄
                            </button>
                            <button
                                onClick={flipVideoVertical}
                                className={`${styles.controlButton} ${videoSettings.flipV ? styles.active : ''}`}
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
                            <button
                                onClick={toggleLocalVideo}
                                className={`${styles.controlButton} ${!showLocalVideo ? styles.active : ''}`}
                                title={showLocalVideo ? 'Скрыть локальное видео' : 'Показать локальное видео'}
                            >
                                {showLocalVideo ? '👁' : '👁‍🗨'}
                            </button>
                            <button
                                onClick={toggleMuteLocalAudio}
                                className={`${styles.controlButton} ${muteLocalAudio ? styles.active : ''}`}
                                title={muteLocalAudio ? 'Включить микрофон' : 'Отключить микрофон'}
                            >
                                {muteLocalAudio ? '🎤🔇' : '🎤'}
                            </button>
                            <button
                                onClick={toggleMuteRemoteAudio}
                                className={`${styles.controlButton} ${muteRemoteAudio ? styles.active : ''}`}
                                title={muteRemoteAudio ? 'Включить звук' : 'Отключить звук'}
                            >
                                {muteRemoteAudio ? '🔈🔇' : '🔈'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}