'use client';

import { useState } from 'react';
import { useMediaDevices } from './hooks/useMediaDevices';
import { useVideoStream } from './hooks/useVideoStream';
import VideoPlayer from './components/VideoPlayer';
import styles from './styles.module.css';

export default function WebRTCPage() {
    // Проверка поддержки медиаустройств
    const {
        isSupported,
        hasPermission,
        error: devicesError
    } = useMediaDevices();

    // Локальный поток (камера пользователя)
    const {
        stream: localStream,
        startStream: startLocalStream,
        stopStream: stopLocalStream,
        error: localStreamError
    } = useVideoStream();

    // Удалённый поток (для демонстрации)
    const {
        stream: remoteStream,
        error: remoteStreamError
    } = useVideoStream();

    const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');

    const handleStartCall = async () => {
        setCallStatus('connecting');
        try {
            await startLocalStream({ video: true, audio: true });
            setCallStatus('active');

            // Здесь будет логика WebRTC соединения
            // Для демонстрации просто копируем локальный поток в удалённый
            if (localStream) {
                // В реальном приложении здесь будет установка peer connection
                // Это временная заглушка для демонстрации
                remoteStream?.getTracks().forEach(track => track.stop());
                const [videoTrack] = localStream.getVideoTracks();
                const [audioTrack] = localStream.getAudioTracks();
                const newRemoteStream = new MediaStream([videoTrack, audioTrack]);
                // В реальном приложении поток будет приходить от удалённого участника
            }
        } catch (err) {
            console.error('Failed to start call:', err);
            setCallStatus('error');
        }
    };

    const handleEndCall = () => {
        stopLocalStream();
        setCallStatus('idle');
    };

    return (
        <div className={styles.container}>
            <h1>WebRTC Video Call</h1>

            {/* Сообщения об ошибках */}
            {!isSupported && (
                <div className={styles.error}>
                    Ваш браузер не поддерживает видео-звонки
                </div>
            )}

            {devicesError && (
                <div className={styles.error}>
                    Ошибка доступа к устройствам: {devicesError.message}
                </div>
            )}

            {localStreamError && (
                <div className={styles.error}>
                    Ошибка локального потока: {localStreamError.message}
                </div>
            )}

            {remoteStreamError && (
                <div className={styles.error}>
                    Ошибка удалённого потока: {remoteStreamError.message}
                </div>
            )}

            {/* Основной интерфейс */}
            {isSupported && (
                <>
                    <div className={styles.videoContainer}>
                        <VideoPlayer
                            stream={localStream}
                            isMuted={true}
                            className={styles.video}
                        />
                        <VideoPlayer
                            stream={remoteStream}
                            isMuted={false}
                            className={styles.video}
                        />
                    </div>

                    <div className={styles.controls}>
                        <button
                            onClick={handleStartCall}
                            disabled={!hasPermission || callStatus !== 'idle'}
                            className={styles.button}
                        >
                            {callStatus === 'connecting' ? 'Подключение...' : 'Начать звонок'}
                        </button>

                        <button
                            onClick={handleEndCall}
                            disabled={callStatus !== 'active'}
                            className={`${styles.button} ${styles.endButton}`}
                        >
                            Завершить
                        </button>
                    </div>

                    <div className={styles.status}>
                        Статус: {{
                        'idle': 'Готов к подключению',
                        'connecting': 'Устанавливается соединение...',
                        'active': 'Звонок активен',
                        'error': 'Ошибка соединения'
                    }[callStatus]}
                    </div>
                </>
            )}
        </div>
    );
}