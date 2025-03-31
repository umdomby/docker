//webrtc/page.tsx
'use client'

import { VideoCallApp } from './VideoCallApp'
import { useEffect, useState } from 'react'
import { checkWebRTCSupport, getBrowserName, getDeviceInfo } from './lib/webrtc'
import styles from './styles.module.css'

export default function WebRTCPage() {
    const [isSupported, setIsSupported] = useState<boolean | null>(null)
    const [mediaAccess, setMediaAccess] = useState<{
        status: 'granted' | 'denied' | 'prompt' | 'not_found' | 'unknown'
        error?: string
        devices?: MediaDeviceInfo[]
    }>({ status: 'unknown' })
    const [browserName, setBrowserName] = useState<string>('')
    const [isChecking, setIsChecking] = useState(false)

    useEffect(() => {
        const initialize = async () => {
            // Проверка поддержки WebRTC
            const supported = checkWebRTCSupport()
            setIsSupported(supported)
            setBrowserName(getBrowserName())

            if (supported) {
                await checkMediaAccess()
                startAutoRefresh()
            }
        }

        initialize()

        return () => {
            stopAutoRefresh()
        }
    }, [])

    const startAutoRefresh = () => {
        const interval = setInterval(() => {
            if (mediaAccess.status === 'denied') {
                checkMediaAccess()
            }
        }, 10000) // Проверка каждые 10 секунд

        return () => clearInterval(interval)
    }

    const stopAutoRefresh = () => {
        clearInterval(startAutoRefresh as unknown as number)
    }

    const checkMediaAccess = async () => {
        setIsChecking(true)
        try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            const hasVideo = devices.some(d => d.kind === 'videoinput')
            const hasAudio = devices.some(d => d.kind === 'audioinput')

            if (!hasVideo || !hasAudio) {
                setMediaAccess({
                    status: 'not_found',
                    error: 'Устройства не найдены',
                    devices
                })
                return
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            })
            stream.getTracks().forEach(track => track.stop())

            setMediaAccess({
                status: 'granted',
                devices: await getDeviceInfo()
            })
        } catch (err: any) {
            console.error('Media access error:', err)
            setMediaAccess({
                status: err.name === 'NotAllowedError' ? 'denied' : 'not_found',
                error: err.message,
                devices: await navigator.mediaDevices.enumerateDevices()
            })
        } finally {
            setIsChecking(false)
        }
    }

    const handleRetry = async () => {
        await checkMediaAccess()
    }

    const handleOpenSettings = () => {
        if (browserName === 'Chrome') {
            window.open('chrome://settings/content/camera')
            window.open('chrome://settings/content/microphone')
        } else if (browserName === 'Firefox') {
            window.open('about:preferences#privacy')
        } else if (browserName === 'Safari') {
            window.open('x-apple.systempreferences:com.apple.preference.security?Privacy_Camera')
            window.open('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone')
        } else if (browserName === 'Edge') {
            window.open('edge://settings/content/camera')
            window.open('edge://settings/content/microphone')
        }
    }

    if (isSupported === false) {
        return (
            <div className={styles.errorContainer}>
                <h1>WebRTC не поддерживается в вашем браузере</h1>
                <p>Для использования видеозвонков требуется современный браузер с поддержкой WebRTC:</p>

                <div className={styles.browserGrid}>
                    <div className={styles.browserCard}>
                        <img src="/browsers/chrome.png" alt="Chrome" width={64} height={64} />
                        <h3>Google Chrome</h3>
                        <a href="https://www.google.com/chrome/" target="_blank">Скачать</a>
                    </div>
                    <div className={styles.browserCard}>
                        <img src="/browsers/firefox.png" alt="Firefox" width={64} height={64} />
                        <h3>Mozilla Firefox</h3>
                        <a href="https://www.mozilla.org/firefox/" target="_blank">Скачать</a>
                    </div>
                    <div className={styles.browserCard}>
                        <img src="/browsers/edge.png" alt="Edge" width={64} height={64} />
                        <h3>Microsoft Edge</h3>
                        <a href="https://www.microsoft.com/edge" target="_blank">Скачать</a>
                    </div>
                </div>
            </div>
        )
    }

    if (mediaAccess.status === 'denied' || mediaAccess.status === 'not_found') {
        return (
            <div className={styles.errorContainer}>
                <h1>
                    {mediaAccess.status === 'denied'
                        ? 'Доступ к камере и микрофону запрещен'
                        : 'Устройства не найдены'}
                </h1>

                <div className={styles.solutionBox}>
                    <h2>Решение для {browserName}:</h2>

                    {browserName === 'Chrome' && (
                        <ol>
                            <li>Нажмите на значок <strong>🔒 Замок</strong> в адресной строке</li>
                            <li>В разрешениях выберите <strong>"Разрешить"</strong> для камеры и микрофона</li>
                            <li>Или <button onClick={handleOpenSettings}>откройте настройки Chrome</button></li>
                            <li>Обновите страницу после изменения настроек</li>
                        </ol>
                    )}

                    {browserName === 'Firefox' && (
                        <ol>
                            <li>Нажмите на значок <strong>🔒 Замок</strong> в адресной строке</li>
                            <li>Выберите <strong>"Изменить настройки"</strong></li>
                            <li>Установите <strong>"Разрешить"</strong> для камеры и микрофона</li>
                            <li>Или <button onClick={handleOpenSettings}>откройте настройки Firefox</button></li>
                        </ol>
                    )}

                    {mediaAccess.status === 'not_found' && (
                        <div className={styles.deviceWarning}>
                            <p>Обнаружены следующие устройства:</p>
                            <ul>
                                {mediaAccess.devices?.map(device => (
                                    <li key={device.deviceId}>
                                        {device.label || `Устройство ${device.kind}`} ({device.kind})
                                    </li>
                                ))}
                            </ul>
                            <p>Проверьте подключение камеры и микрофона.</p>
                        </div>
                    )}

                    <div className={styles.actions}>
                        <button
                            onClick={handleRetry}
                            disabled={isChecking}
                            className={styles.primaryButton}
                        >
                            {isChecking ? (
                                <span className={styles.spinner}></span>
                            ) : (
                                'Проверить снова'
                            )}
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className={styles.secondaryButton}
                        >
                            Обновить страницу
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <main className={styles.container}>
            {isSupported === null || mediaAccess.status === 'unknown' ? (
                <div className={styles.loadingScreen}>
                    <div className={styles.loadingAnimation}>
                        <div className={styles.cameraIcon}></div>
                        <div className={styles.progressBar}>
                            <div className={styles.progress}></div>
                        </div>
                    </div>
                    <p>Проверка доступа к устройствам...</p>
                </div>
            ) : (
                <VideoCallApp devices={mediaAccess.devices} />
            )}
        </main>
    )
}