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
    const [roomIdInput, setRoomIdInput] = useState('');

    const {
        localStream,
        remoteStream,
        roomId,
        startCall,
        joinRoom,
        stopCall,
        isConnected,
        connectionStatus,
        error
    } = useWebRTC(selectedDevices);

    const refreshDevices = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            const newDevices = await navigator.mediaDevices.enumerateDevices();
            setDevices(newDevices);

            const videoDevice = newDevices.find(d => d.kind === 'videoinput');
            const audioDevice = newDevices.find(d => d.kind === 'audioinput');

            setSelectedDevices({
                video: videoDevice?.deviceId || '',
                audio: audioDevice?.deviceId || ''
            });

            stream.getTracks().forEach(track => track.stop());

            return newDevices;
        } catch (err) {
            console.error('Error refreshing devices:', err);
            return [];
        }
    };

    useEffect(() => {
        refreshDevices();
    }, []);

    const handleDeviceChange = (type: 'video' | 'audio', deviceId: string) => {
        setSelectedDevices(prev => ({ ...prev, [type]: deviceId }));
    };

    const handleStartCall = () => {
        if (!selectedDevices.video && !selectedDevices.audio) {
            alert('Пожалуйста, выберите хотя бы одно устройство');
            return;
        }

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

            {!isConnected ? (
                <div className={styles.setupPanel}>
                    <div className={styles.deviceSelection}>
                        <h2>Настройки устройств</h2>
                        <DeviceSelector
                            devices={devices}
                            selectedDevices={selectedDevices}
                            onChange={handleDeviceChange}
                            onRefresh={refreshDevices}
                        />
                    </div>

                    <div className={styles.connectionOptions}>
                        <div className={styles.joinContainer}>
                            <input
                                type="text"
                                value={roomIdInput}
                                onChange={(e) => setRoomIdInput(e.target.value)}
                                placeholder="Введите ID комнаты"
                                className={styles.roomInput}
                            />
                            <button onClick={handleStartCall} className={styles.primaryButton}>
                                Начать/Присоединиться
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.callPanel}>
                    <div className={styles.roomInfo}>
                        <p>ID комнаты: <strong>{roomId}</strong></p>
                        <p>Статус: <span className={styles[connectionStatus]}>{connectionStatus}</span></p>
                        <button onClick={stopCall} className={styles.stopButton}>
                            Завершить звонок
                        </button>
                    </div>

                    <div className={styles.videoContainer}>
                        <div className={styles.videoWrapper}>
                            <VideoPlayer stream={localStream} muted className={styles.video} />
                            <div className={styles.videoLabel}>Вы</div>
                        </div>
                        <div className={styles.videoWrapper}>
                            <VideoPlayer stream={remoteStream} className={styles.video} />
                            <div className={styles.videoLabel}>Собеседник</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};