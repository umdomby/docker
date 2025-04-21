// file: docker-ardua/components/webrtc/index.tsx

'use client'

import { VideoCallApp } from './VideoCallApp';
import { useEffect, useState } from 'react';
import { checkWebRTCSupport } from './lib/webrtc';
import styles from './styles.module.css';

export default function WebRTCPage() {
    const [isSupported, setIsSupported] = useState<boolean | null>(null);
    const [browserRecommendation, setBrowserRecommendation] = useState('');

    useEffect(() => {
        const checkSupport = async () => {
            const supported = checkWebRTCSupport();
            setIsSupported(supported);

            if (!supported) {
                // Определяем браузер для более точного сообщения
                const userAgent = navigator.userAgent;
                let recommendation = 'Please use a modern browser like Chrome, Firefox or Edge';

                if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
                    recommendation = 'For Safari, please enable WebRTC in settings or use Chrome/Firefox';
                } else if (userAgent.includes('IE') || userAgent.includes('Trident')) {
                    recommendation = 'Internet Explorer does not support WebRTC. Please use Chrome, Firefox or Edge';
                }

                setBrowserRecommendation(recommendation);
            }
        };

        checkSupport();
    }, []);

    if (isSupported === false) {
        return (
            <div className={styles.unsupportedContainer}>
                <h2>WebRTC is not supported in your browser</h2>
                <p>{browserRecommendation}</p>
                <div className={styles.browserList}>
                    <p>Supported browsers:</p>
                    <ul>
                        <li>Google Chrome 28+</li>
                        <li>Mozilla Firefox 22+</li>
                        <li>Microsoft Edge 12+</li>
                        <li>Safari 11+ (with limitations)</li>
                        <li>Opera 18+</li>
                    </ul>
                </div>
                <p className={styles.note}>
                    Note: Some browsers may require HTTPS connection for WebRTC to work.
                </p>
            </div>
        );
    }

    return (
        <div>
            {isSupported === null ? (
                <div>Checking browser compatibility...</div>
            ) : (
                <VideoCallApp />
            )}
        </div>
    );
}