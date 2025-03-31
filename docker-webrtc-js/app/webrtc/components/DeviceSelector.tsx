// DeviceSelector.tsx
import { useState, useEffect } from 'react';
import styles from '../styles.module.css';

interface DeviceSelectorProps {
    devices?: MediaDeviceInfo[];
    selectedDevices: {
        video: string;
        audio: string;
    };
    onChange: (type: 'video' | 'audio', deviceId: string) => void;
}

export const DeviceSelector = ({
                                   devices,
                                   selectedDevices,
                                   onChange
                               }: DeviceSelectorProps) => {
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);

    useEffect(() => {
        if (devices) {
            setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
            setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
        }
    }, [devices]);

    const handleRefresh = async () => {
        try {
            const newDevices = await navigator.mediaDevices.enumerateDevices();
            setVideoDevices(newDevices.filter(d => d.kind === 'videoinput'));
            setAudioDevices(newDevices.filter(d => d.kind === 'audioinput'));
        } catch (error) {
            console.error('Error refreshing devices:', error);
        }
    };

    return (
        <div className={styles.deviceSelector}>
            <div className={styles.deviceGroup}>
                <label>Камера:</label>
                <select
                    value={selectedDevices.video}
                    onChange={(e) => onChange('video', e.target.value)}
                    disabled={videoDevices.length === 0}
                >
                    {videoDevices.length === 0 ? (
                        <option value="">Камеры не найдены</option>
                    ) : (
                        videoDevices.map(device => (
                            <option key={device.deviceId} value={device.deviceId}>
                                {device.label || `Камера ${videoDevices.indexOf(device) + 1}`}
                            </option>
                        ))
                    )}
                </select>
            </div>

            <div className={styles.deviceGroup}>
                <label>Микрофон:</label>
                <select
                    value={selectedDevices.audio}
                    onChange={(e) => onChange('audio', e.target.value)}
                    disabled={audioDevices.length === 0}
                >
                    {audioDevices.length === 0 ? (
                        <option value="">Микрофоны не найдены</option>
                    ) : (
                        audioDevices.map(device => (
                            <option key={device.deviceId} value={device.deviceId}>
                                {device.label || `Микрофон ${audioDevices.indexOf(device) + 1}`}
                            </option>
                        ))
                    )}
                </select>
            </div>

            <button
                onClick={handleRefresh}
                className={styles.refreshButton}
            >
                Обновить устройства
            </button>
        </div>
    );
};