import { useWebRTC } from './hooks/useWebRTC';
import styles from './styles.module.css';
import { VideoPlayer } from './components/VideoPlayer';
import { DeviceSelector } from './components/DeviceSelector';
import { useEffect, useState } from 'react';

export const VideoCallApp = () => {
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDevices, setSelectedDevices] = useState({
        video: '',
        audio: ''
    });
    const [roomIdInput, setRoomIdInput] = useState('123'); // Установим дефолтное значение для теста
    const [username, setUsername] = useState(`User${Math.floor(Math.random() * 1000)}`);

    const {
        localStream,
        remoteUsers,
        roomId,
        startCall,
        joinRoom,
        stopCall,
        isConnected,
        connectionStatus,
        error
    } = useWebRTC(selectedDevices, username);

    // Загружаем устройства при монтировании
    useEffect(() => {
        const loadDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                setDevices(devices);

                const videoDevice = devices.find(d => d.kind === 'videoinput');
                const audioDevice = devices.find(d => d.kind === 'audioinput');

                if (videoDevice) setSelectedDevices(prev => ({...prev, video: videoDevice.deviceId}));
                if (audioDevice) setSelectedDevices(prev => ({...prev, audio: audioDevice.deviceId}));
            } catch (err) {
                console.error('Error loading devices:', err);
            }
        };

        loadDevices();
    }, []);

    const handleStartCall = () => {
        if (roomIdInput.trim()) {
            joinRoom(roomIdInput.trim());
        } else {
            startCall(true);
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>WebRTC Video Call</h1>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.controls}>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ваше имя"
                    className={styles.input}
                />
                <input
                    type="text"
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value)}
                    placeholder="ID комнаты"
                    className={styles.input}
                />
                <button
                    onClick={handleStartCall}
                    className={styles.button}
                    disabled={isConnected}
                >
                    {isConnected ? 'Подключено' : 'Подключиться'}
                </button>
                {isConnected && (
                    <button onClick={stopCall} className={styles.stopButton}>
                        Завершить
                    </button>
                )}
            </div>

            <div className={styles.videoContainer}>
                {/* Локальное видео */}
                {localStream && (
                    <div className={styles.videoWrapper}>
                        <VideoPlayer stream={localStream} muted className={styles.video} />
                        <div className={styles.videoLabel}>Вы: {username}</div>
                    </div>
                )}

                {/* Удаленные видео */}
                {remoteUsers.map(user => (
                    <div key={user.username} className={styles.videoWrapper}>
                        {user.stream ? (
                            <>
                                <VideoPlayer stream={user.stream} className={styles.video} />
                                <div className={styles.videoLabel}>{user.username}</div>
                            </>
                        ) : (
                            <div className={styles.videoPlaceholder}>
                                <div>{user.username}</div>
                                <div>Подключается...</div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {!isConnected && (
                <div className={styles.deviceSelection}>
                    <h3>Выберите устройства:</h3>
                    <DeviceSelector
                        devices={devices}
                        selectedDevices={selectedDevices}
                        onChange={(type, deviceId) =>
                            setSelectedDevices(prev => ({...prev, [type]: deviceId}))
                        }
                    />
                </div>
            )}
        </div>
    );
};