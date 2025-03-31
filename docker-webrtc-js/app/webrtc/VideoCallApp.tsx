import { useWebRTC } from './hooks/useWebRTC';
import styles from './styles.module.css';
import { VideoPlayer } from './components/VideoPlayer';
import { DeviceSelector } from './components/DeviceSelector';
import { useEffect, useState } from 'react';

interface VideoCallAppProps {
    initialDevices?: MediaDeviceInfo[];
}

export const VideoCallApp = ({ initialDevices }: VideoCallAppProps) => {
    const [devices, setDevices] = useState<MediaDeviceInfo[]>(initialDevices || []);
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

    useEffect(() => {
        if (initialDevices?.length) {
            updateDeviceState(initialDevices);
        } else {
            refreshDevices();
        }
    }, []);

    const updateDeviceState = (deviceList: MediaDeviceInfo[]) => {
        setDevices(deviceList);

        // Автовыбор устройств если не выбраны
        if (!selectedDevices.video) {
            const video = deviceList.find(d => d.kind === 'videoinput')?.deviceId || '';
            setSelectedDevices(prev => ({ ...prev, video }));
        }
        if (!selectedDevices.audio) {
            const audio = deviceList.find(d => d.kind === 'audioinput')?.deviceId || '';
            setSelectedDevices(prev => ({ ...prev, audio }));
        }
    };

    const refreshDevices = async () => {
        try {
            // Запрашиваем разрешение на доступ к устройствам
            await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            const newDevices = await navigator.mediaDevices.enumerateDevices();
            updateDeviceState(newDevices);
            return newDevices;
        } catch (error) {
            console.error('Error refreshing devices:', error);
            return [];
        }
    };

    const handleDeviceChange = (type: 'video' | 'audio', deviceId: string) => {
        setSelectedDevices(prev => ({
            ...prev,
            [type]: deviceId
        }));
    };

    const handleStartCall = () => {
        startCall(true);
    };

    const handleJoinCall = () => {
        if (roomIdInput.trim()) {
            joinRoom(roomIdInput.trim());
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>WebRTC Video Call</h1>

            {error && <div className={styles.error}>{error}</div>}

            {!isConnected ? (
                <div className={styles.setupPanel}>
                    <div className={styles.deviceSelection}>
                        <h2 className={styles.sectionTitle}>Device Settings</h2>
                        <DeviceSelector
                            devices={devices}
                            selectedDevices={selectedDevices}
                            onChange={handleDeviceChange}
                            onRefresh={refreshDevices}
                        />
                    </div>

                    <div className={styles.connectionOptions}>
                        <button
                            onClick={handleStartCall}
                            className={styles.primaryButton}
                            disabled={!selectedDevices.video && !selectedDevices.audio}
                        >
                            Start New Call
                        </button>

                        <div className={styles.joinContainer}>
                            <input
                                type="text"
                                value={roomIdInput}
                                onChange={(e) => setRoomIdInput(e.target.value)}
                                placeholder="Enter Room ID"
                                className={styles.roomInput}
                            />
                            <button
                                onClick={handleJoinCall}
                                className={styles.secondaryButton}
                                disabled={!roomIdInput.trim()}
                            >
                                Join Call
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.callPanel}>
                    <div className={styles.roomInfo}>
                        <p>Room ID: <strong>{roomId}</strong></p>
                        <p>Status: <span className={styles[connectionStatus]}>{connectionStatus}</span></p>
                        <button onClick={stopCall} className={styles.stopButton}>
                            End Call
                        </button>
                    </div>

                    <div className={styles.videoContainer}>
                        <div className={styles.videoWrapper}>
                            <VideoPlayer stream={localStream} muted className={styles.video} />
                            <div className={styles.videoLabel}>You</div>
                        </div>
                        <div className={styles.videoWrapper}>
                            <VideoPlayer stream={remoteStream} className={styles.video} />
                            <div className={styles.videoLabel}>Remote</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};