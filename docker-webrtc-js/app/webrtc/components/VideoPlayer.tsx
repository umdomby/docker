'use client';

import { useEffect, useRef } from 'react';
import styles from './styles.module.css';
interface VideoPlayerProps {
    stream: MediaStream | null;
    isMuted: boolean;
    className?: string;
}

export default function VideoPlayer({ stream, isMuted, className }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Обновляем srcObject при изменении потока
        video.srcObject = stream;

        // Автоматическая подстройка размера видео
        const handleResize = () => {
            if (video.videoWidth > 0) {
                video.style.height = `${video.videoHeight / video.videoWidth * 100}%`;
            }
        };

        video.addEventListener('resize', handleResize);
        return () => {
            video.removeEventListener('resize', handleResize);
        };
    }, [stream]);

    return (
        <div className={styles.videoWrapper}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                className={className}
            />
            {!stream && (
                <div className={styles.placeholder}>
                    {isMuted ? 'Ваша камера' : 'Удалённый участник'}
                </div>
            )}
        </div>
    );
}