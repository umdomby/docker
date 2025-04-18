// file: docker-ardua/components/control/hooks/useAutoConnectSocket.ts
import { useEffect } from 'react'
import { useMotorControlStore } from '@/stores/motorControlStore'

/**
 * Хук для автоматического подключения к WebSocket
 * Проверяет настройку autoConnect в localStorage и при необходимости подключается
 */
export const useAutoConnectSocket = () => {
    const { initialize, autoConnect, deviceId, connectWebSocket } = useMotorControlStore()

    // Инициализация при монтировании компонента
    useEffect(() => {
        initialize()
    }, [initialize])

    // Автоподключение при изменении autoConnect или deviceId
    useEffect(() => {
        if (autoConnect && deviceId) {
            connectWebSocket(deviceId)
        }
    }, [autoConnect, deviceId, connectWebSocket])
}