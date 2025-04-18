// hooks/useAutoConnectSocket.ts
'use client'

import { useEffect } from 'react'
import { useMotorControlStore } from '@/stores/motorControlStore'

export const useAutoConnectSocket = () => {
    useEffect(() => {
        const autoConnect = localStorage.getItem('autoConnect') === 'true'
        const selectedDeviceId = localStorage.getItem('selectedDeviceId')

        if (autoConnect) {
            // Здесь должна быть логика подключения к WebSocket

            console.log('Auto-connecting to device:', selectedDeviceId)
        }
    }, [])
}