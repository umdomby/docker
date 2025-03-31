//VideoCallApp.tsx
import { useWebRTC } from './hooks/useWebRTC'
import styles from './styles.module.css'
import { VideoPlayer } from './components/VideoPlayer'
import { DeviceSelector } from './components/DeviceSelector'
import { useEffect, useState } from 'react'

interface VideoCallAppProps {
    devices?: MediaDeviceInfo[]
}

export const VideoCallApp = ({ devices }: VideoCallAppProps) => {
    const [roomIdInput, setRoomIdInput] = useState('')
    const [selectedDevices, setSelectedDevices] = useState({
        video: '',
        audio: ''
    })

    const {
        localStream,
        remoteStream,
        roomId,
        startCall,
        joinRoom,
        isConnected,
        connectionStatus
    } = useWebRTC(selectedDevices)

    useEffect(() => {
        if (devices?.length) {
            const defaultVideo = devices.find(d => d.kind === 'videoinput')?.deviceId || ''
            const defaultAudio = devices.find(d => d.kind === 'audioinput')?.deviceId || ''
            setSelectedDevices({
                video: defaultVideo,
                audio: defaultAudio
            })
        }
    }, [devices])

    const handleStartCall = () => {
        startCall(true)
    }

    const handleJoinCall = () => {
        if (roomIdInput.trim()) {
            joinRoom(roomIdInput.trim())
            startCall(false)
        }
    }

    const handleDeviceChange = (type: 'video' | 'audio', deviceId: string) => {
        setSelectedDevices(prev => ({
            ...prev,
            [type]: deviceId
        }))
    }

    return (
        <div className={styles.container}>
            <h1>WebRTC Video Call</h1>

            {!isConnected ? (
                <div className={styles.setupPanel}>
                    <div className={styles.deviceSelection}>
                        <h2>Настройки устройств</h2>
                        <DeviceSelector
                            devices={devices}
                            selectedDevices={selectedDevices}
                            onChange={handleDeviceChange}
                        />
                    </div>

                    <div className={styles.connectionOptions}>
                        <button
                            onClick={handleStartCall}
                            className={styles.primaryButton}
                        >
                            Начать новый звонок
                        </button>

                        <div className={styles.joinContainer}>
                            <input
                                type="text"
                                value={roomIdInput}
                                onChange={(e) => setRoomIdInput(e.target.value)}
                                placeholder="Введите ID комнаты"
                            />
                            <button
                                onClick={handleJoinCall}
                                className={styles.secondaryButton}
                                disabled={!roomIdInput.trim()}
                            >
                                Присоединиться
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.callPanel}>
                    <div className={styles.roomInfo}>
                        <p>ID комнаты: <strong>{roomId}</strong></p>
                        <p>Статус: <span className={styles[connectionStatus]}>{connectionStatus}</span></p>
                    </div>

                    <div className={styles.videoContainer}>
                        <div className={styles.videoWrapper}>
                            <VideoPlayer stream={localStream} muted />
                            <div className={styles.videoLabel}>Вы</div>
                        </div>
                        <div className={styles.videoWrapper}>
                            <VideoPlayer stream={remoteStream} />
                            <div className={styles.videoLabel}>Участник</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}