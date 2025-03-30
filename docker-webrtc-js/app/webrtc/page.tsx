'use client';

import dynamic from 'next/dynamic';
import styles from './styles.module.css';

const VideoCallApp = dynamic(
    () => import('./VideoCallApp'),
    {
        ssr: false,
        loading: () => (
            <div className={styles.loading}>
                <div className={styles.spinner} /> {/* Простой спиннер */}
                Загружаем WebRTC компоненты...
            </div>
        )
    }
);

export default function WebRTCPage() {
    return (
        <div className={styles.container}>
            <h1>WebRTC Видеозвонок</h1>
            <VideoCallApp />
        </div>
    );
}