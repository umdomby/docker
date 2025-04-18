// hooks/useAutoConnectSocket.ts
'use client'

import { useEffect } from 'react'
import { useMotorControlStore } from '@/stores/motorControlStore'
import { useESP8266StatusStore } from '@/components/dataStores/statusConnected_ESP8266'

export const useAutoConnectSocket = () => {
    const {
        autoConnect,
        deviceId,
        initialize,
        connectWebSocket,
        setConnectionStatus
    } = useMotorControlStore()

    const {
        setIsConnected,
        setIsIdentified,
        setEspConnected,
        setDeviceId
    } = useESP8266StatusStore()

    useEffect(() => {
        initialize()
    }, [initialize])

    useEffect(() => {
        if (autoConnect && deviceId) {
            connectWebSocket(deviceId)

            setIsConnected(true)
            setDeviceId(deviceId)

            setTimeout(() => {
                setIsIdentified(true)
                setConnectionStatus(true, true, false)

                setTimeout(() => {
                    setEspConnected(true)
                    setConnectionStatus(true, true, true)
                }, 1000)
            }, 500)
        }
    }, [autoConnect, deviceId, connectWebSocket, setIsConnected, setIsIdentified, setEspConnected, setDeviceId, setConnectionStatus])
}