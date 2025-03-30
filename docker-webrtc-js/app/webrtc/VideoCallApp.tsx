'use client';

import { useEffect, useState } from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import VideoPlayer from './components/VideoPlayer';
import styles from './styles.module.css';

export default function VideoCallApp() {
    const [roomId, setRoomId] = useState('default-room');
    const [inputRoomId, setInputRoomId] = useState('default-room');
    const [hasMounted, setHasMounted] = useState(false);

    const {
        localStream,
        remoteStream,
        isConnected,
        error,
        startCall,
        endCall
    } = useWebRTC(roomId);

    useEffect(() => {
        setHasMounted(true);
        return () => {
            endCall();
        };
    }, [endCall]);

    const handleStartCall = () => {
        setRoomId(inputRoomId);
        startCall();
    };

    const handleEndCall = () => {
        endCall();
        setInputRoomId(roomId);
    };

    if (!hasMounted) {
        return <div className={styles.loading}>Initializing WebRTC...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.roomControls}>
                <input
                    type="text"
                    value={inputRoomId}
                    onChange={(e) => setInputRoomId(e.target.value)}
                    placeholder="Enter room ID"
                    disabled={isConnected}
                    className={styles.roomInput}
                />
                <button
                    onClick={isConnected ? handleEndCall : handleStartCall}
                    className={`${styles.button} ${
                        isConnected ? styles.endButton : styles.startButton
                    }`}
                    disabled={!inputRoomId.trim()}
                >
                    {isConnected ? 'End Call' : 'Start Call'}
                </button>
            </div>

            {error && (
                <div className={styles.error}>
                    Error: {error}
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

            <div className={styles.status}>
                Status: {isConnected ? `Connected to room: ${roomId}` : 'Disconnected'}
            </div>
        </div>
    );
}