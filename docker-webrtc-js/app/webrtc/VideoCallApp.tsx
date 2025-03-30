'use client';

import { useState, useEffect } from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import VideoPlayer from './components/VideoPlayer';
import styles from './styles.module.css';

export default function VideoCallApp() {
    const [roomId, setRoomId] = useState('default-room');
    const [inputRoomId, setInputRoomId] = useState('default-room');
    const [hasMounted, setHasMounted] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null); // Добавляем локальное состояние для ошибок

    const {
        localStream,
        remoteStream,
        isConnected,
        isLoading,
        error: rtcError, // Переименовываем error из useWebRTC
        connectionStatus,
        startCall,
        endCall
    } = useWebRTC(roomId);

    useEffect(() => {
        setHasMounted(true);
        return () => {
            endCall();
        };
    }, [endCall]);

    // Объединяем ошибки из useWebRTC и локальные ошибки
    const error = rtcError || localError;

    const handleStartCall = async () => {
        if (!inputRoomId.trim()) {
            setLocalError('Please enter a room ID');
            return;
        }

        setLocalError(null);
        setRoomId(inputRoomId);
        try {
            await startCall();
        } catch (err) {
            setLocalError(err instanceof Error ? err.message : 'Failed to start call');
        }
    };

    const handleEndCall = () => {
        endCall();
        setInputRoomId(roomId);
    };

    const getStatusMessage = () => {
        switch (connectionStatus) {
            case 'connecting':
                return isLoading ? 'Establishing connection...' : 'Connecting...';
            case 'connected':
                return `Connected to room: ${roomId}`;
            case 'disconnecting':
                return 'Ending call...';
            case 'disconnected':
                return 'Disconnected';
            default:
                return 'Ready to connect';
        }
    };

    const getStatusClass = () => {
        switch (connectionStatus) {
            case 'connected':
                return styles.statusConnected;
            case 'disconnected':
                return styles.statusDisconnected;
            default:
                return styles.statusPending;
        }
    };

    if (!hasMounted) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                Initializing WebRTC...
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>WebRTC Video Call</h1>

            <div className={styles.controls}>
                <input
                    type="text"
                    value={inputRoomId}
                    onChange={(e) => setInputRoomId(e.target.value)}
                    placeholder="Enter room ID"
                    disabled={isConnected || isLoading}
                    className={styles.input}
                    aria-label="Room ID"
                />
                <button
                    onClick={isConnected ? handleEndCall : handleStartCall}
                    className={`${styles.button} ${
                        isConnected ? styles.endButton : styles.startButton
                    }`}
                    disabled={!inputRoomId.trim() || isLoading}
                    aria-label={isConnected ? 'End call' : 'Start call'}
                >
                    {isLoading ? (
                        <span className={styles.buttonLoading}>Connecting...</span>
                    ) : isConnected ? (
                        'End Call'
                    ) : (
                        'Start Call'
                    )}
                </button>
            </div>

            {error && (
                <div className={styles.error}>
                    <p>Error: {error}</p>
                    <button
                        onClick={() => setLocalError(null)}
                        className={styles.dismissButton}
                    >
                        Dismiss
                    </button>
                </div>
            )}

            <div className={styles.videoContainer}>
                <VideoPlayer
                    stream={localStream}
                    isMuted={true}
                    label="Your Camera"
                    className={styles.video}
                />
                <VideoPlayer
                    stream={remoteStream}
                    isMuted={false}
                    label="Remote Stream"
                    className={styles.video}
                />
            </div>

            <div className={`${styles.status} ${getStatusClass()}`}>
                Status: {getStatusMessage()}
            </div>
        </div>
    );
}