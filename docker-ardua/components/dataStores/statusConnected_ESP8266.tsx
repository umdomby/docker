// components/dataStores/statusConnected_ESP8266.tsx
"use client"

import { create } from 'zustand'

interface ESP8266StatusStore {
    isConnected: boolean
    isIdentified: boolean
    espConnected: boolean
    deviceId: string
    setIsConnected: (isConnected: boolean) => void
    setIsIdentified: (isIdentified: boolean) => void
    setEspConnected: (espConnected: boolean) => void
    setDeviceId: (deviceId: string) => void
}

export const useESP8266StatusStore = create<ESP8266StatusStore>((set) => ({
    isConnected: false,
    isIdentified: false,
    espConnected: false,
    deviceId: '',
    setIsConnected: (isConnected) => set({ isConnected }),
    setIsIdentified: (isIdentified) => set({ isIdentified }),
    setEspConnected: (espConnected) => set({ espConnected }),
    setDeviceId: (deviceId) => set({ deviceId }),
}))

export const StatusConnected_ESP8266 = () => {
    const { isConnected, isIdentified, espConnected } = useESP8266StatusStore()

    return (
        <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
                isConnected
                    ? (isIdentified
                        ? (espConnected ? 'bg-green-500' : 'bg-yellow-500')
                        : 'bg-yellow-500')
                    : 'bg-red-500'
            }`} />
            <span className="text-sm">
        {isConnected
            ? (isIdentified
                ? (espConnected ? 'ESP Connected' : 'Waiting for ESP')
                : 'Connecting...')
            : 'Disconnected'}
      </span>
        </div>
    )
}