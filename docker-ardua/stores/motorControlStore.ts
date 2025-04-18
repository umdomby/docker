// stores/motorControlStore.ts
'use client'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface MotorControlStore {
    leftMotorSpeed: number
    rightMotorSpeed: number
    isConnected: boolean
    isIdentified: boolean
    espConnected: boolean
    deviceId: string
    autoConnect: boolean
    initialize: () => void
    setLeftMotorSpeed: (speed: number) => void
    setRightMotorSpeed: (speed: number) => void
    setConnectionStatus: (isConnected: boolean, isIdentified?: boolean, espConnected?: boolean) => void
    setDeviceId: (id: string) => void
    setAutoConnect: (autoConnect: boolean) => void
    connectWebSocket: (deviceId: string) => void
    disconnectWebSocket: () => void
}

export const useMotorControlStore = create<MotorControlStore>()(
    immer((set, get) => ({
        leftMotorSpeed: 0,
        rightMotorSpeed: 0,
        isConnected: false,
        isIdentified: false,
        espConnected: false,
        deviceId: '',
        autoConnect: false,

        initialize: () => {
            const autoConnect = localStorage.getItem('autoConnect') === 'true'
            const deviceId = localStorage.getItem('selectedDeviceId') || ''
            set({ autoConnect, deviceId })
        },

        setLeftMotorSpeed: (speed) => {
            set((state) => {
                state.leftMotorSpeed = speed
            })
        },

        setRightMotorSpeed: (speed) => {
            set((state) => {
                state.rightMotorSpeed = speed
            })
        },

        setConnectionStatus: (isConnected, isIdentified = false, espConnected = false) => {
            set((state) => {
                state.isConnected = isConnected
                state.isIdentified = isIdentified
                state.espConnected = espConnected
            })
        },

        setDeviceId: (id) => {
            set((state) => {
                state.deviceId = id
            })
            localStorage.setItem('selectedDeviceId', id)
        },

        setAutoConnect: (autoConnect) => {
            set((state) => {
                state.autoConnect = autoConnect
            })
            localStorage.setItem('autoConnect', autoConnect.toString())
        },

        connectWebSocket: (deviceId) => {
            // Здесь должна быть логика подключения к WebSocket
            // Для примера просто устанавливаем статус подключения
            set((state) => {
                state.isConnected = true
                state.deviceId = deviceId
            })
            console.log(`Connecting to device: ${deviceId}`)
        },

        disconnectWebSocket: () => {
            set((state) => {
                state.isConnected = false
                state.isIdentified = false
                state.espConnected = false
            })
        }
    }))
)