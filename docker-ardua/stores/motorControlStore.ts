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
    socket: WebSocket | null
    setLeftMotorSpeed: (speed: number) => void
    setRightMotorSpeed: (speed: number) => void
    setConnectionStatus: (isConnected: boolean, isIdentified?: boolean, espConnected?: boolean) => void
    setDeviceId: (id: string) => void
    setAutoConnect: (value: boolean) => void
    initialize: () => void
    connectWebSocket: (deviceId: string) => void
    disconnectWebSocket: () => void
    sendMotorCommand: () => Promise<void>
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
        socket: null,

        initialize: () => {
            const savedAutoConnect = localStorage.getItem('autoConnect') === 'true'
            const savedDeviceId = localStorage.getItem('selectedDeviceId') || ''
            set((state) => {
                state.autoConnect = savedAutoConnect
                state.deviceId = savedDeviceId
            })
        },

        setLeftMotorSpeed: (speed) => {
            set((state) => {
                state.leftMotorSpeed = speed
            })
            get().sendMotorCommand()
        },

        setRightMotorSpeed: (speed) => {
            set((state) => {
                state.rightMotorSpeed = speed
            })
            get().sendMotorCommand()
        },

        setConnectionStatus: (isConnected, isIdentified = false, espConnected = false) => {
            set((state) => {
                state.isConnected = isConnected
                state.isIdentified = isIdentified
                state.espConnected = espConnected
            })
        },

        setDeviceId: (id) => {
            localStorage.setItem('selectedDeviceId', id)
            set((state) => {
                state.deviceId = id
            })
        },

        setAutoConnect: (value) => {
            localStorage.setItem('autoConnect', value.toString())
            set((state) => {
                state.autoConnect = value
            })
        },

        connectWebSocket: (deviceId) => {
            const { socket, disconnectWebSocket } = get()
            if (socket) disconnectWebSocket()

            const ws = new WebSocket(`wss://ardu.site/ws`)

            ws.onopen = () => {
                set((state) => {
                    state.isConnected = true
                    state.deviceId = deviceId
                    state.socket = ws
                })

                // Отправляем идентификацию
                ws.send(JSON.stringify({
                    type: 'identify',
                    deviceId
                }))
            }

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    console.log('WebSocket message:', data)

                    if (data.type === 'system' && data.status === 'connected') {
                        set((state) => {
                            state.isIdentified = true
                        })
                    } else if (data.type === 'esp_status') {
                        set((state) => {
                            state.espConnected = data.status === 'connected'
                        })
                    }
                } catch (error) {
                    console.error('Error processing message:', error)
                }
            }

            ws.onclose = () => {
                set((state) => {
                    state.isConnected = false
                    state.isIdentified = false
                    state.espConnected = false
                    state.socket = null
                })
            }

            ws.onerror = (error) => {
                console.error('WebSocket error:', error)
            }
        },

        disconnectWebSocket: () => {
            const { socket } = get()
            if (socket) {
                socket.close()
                set((state) => {
                    state.isConnected = false
                    state.isIdentified = false
                    state.espConnected = false
                    state.socket = null
                })
            }
        },

        sendMotorCommand: async () => {
            const { socket, leftMotorSpeed, rightMotorSpeed, deviceId, isConnected } = get()

            if (!isConnected || !socket || socket.readyState !== WebSocket.OPEN) {
                console.warn('WebSocket not connected, cannot send command')
                return
            }

            try {
                const command = {
                    type: 'motor_control',
                    deviceId,
                    leftSpeed: leftMotorSpeed,
                    rightSpeed: rightMotorSpeed,
                    timestamp: Date.now()
                }

                socket.send(JSON.stringify(command))
                console.log('Command sent:', command)
            } catch (error) {
                console.error('Error sending command:', error)
            }
        }
    }))
)