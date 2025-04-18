import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

type SocketStatus = {
    isConnected: boolean
    isIdentified: boolean
    espConnected: boolean
}

type MotorState = {
    speed: number
    direction: 'forward' | 'backward' | 'stop'
}

type MotorControlStore = {
    socketStatus: SocketStatus
    motorA: MotorState
    motorB: MotorState
    deviceId: string
    autoConnect: boolean
    setSocketStatus: (status: Partial<SocketStatus>) => void
    setMotorA: (state: Partial<MotorState>) => void
    setMotorB: (state: Partial<MotorState>) => void
    setDeviceId: (id: string) => void
    setAutoConnect: (value: boolean) => void
    initialize: () => void
    sendCommand: (command: string, params?: any) => void
    ws: WebSocket | null
    connectWebSocket: (deviceIdToConnect: string) => void
    disconnectWebSocket: () => void
}

export const useMotorControlStore = create<MotorControlStore>()(
    immer((set, get) => ({
        socketStatus: {
            isConnected: false,
            isIdentified: false,
            espConnected: false,
        },
        motorA: {
            speed: 0,
            direction: 'stop',
        },
        motorB: {
            speed: 0,
            direction: 'stop',
        },
        deviceId: '',
        autoConnect: false,
        ws: null,

        setSocketStatus: (status) => {
            set((state) => {
                state.socketStatus = { ...state.socketStatus, ...status }
            })
        },

        setMotorA: (state) => {
            set((store) => {
                store.motorA = { ...store.motorA, ...state }
            })
        },

        setMotorB: (state) => {
            set((store) => {
                store.motorB = { ...store.motorB, ...state }
            })
        },

        setDeviceId: (id) => {
            set({ deviceId: id })
            localStorage.setItem('selectedDeviceId', id)
        },

        setAutoConnect: (value) => {
            set({ autoConnect: value })
            localStorage.setItem('autoConnect', value.toString())
        },

        initialize: () => {
            const savedAutoConnect = localStorage.getItem('autoConnect') === 'true'
            const savedDevices = localStorage.getItem('espDeviceList')
            const savedDeviceId = localStorage.getItem('selectedDeviceId')

            set({
                autoConnect: savedAutoConnect,
                deviceId: savedDeviceId || '',
            })

            if (savedAutoConnect && savedDeviceId) {
                get().connectWebSocket(savedDeviceId)
            }
        },

        sendCommand: (command, params) => {
            const { ws, deviceId, socketStatus } = get()
            if (!socketStatus.isIdentified) return

            if (ws?.readyState === WebSocket.OPEN) {
                const msg = JSON.stringify({
                    command,
                    params,
                    deviceId,
                    timestamp: Date.now(),
                    expectAck: true,
                })
                ws.send(msg)
            }
        },

        connectWebSocket: (deviceIdToConnect) => {
            const { ws, disconnectWebSocket } = get()
            if (ws) disconnectWebSocket()

            const newWs = new WebSocket('wss://ardu.site/ws')

            newWs.onopen = () => {
                get().setSocketStatus({
                    isConnected: true,
                    isIdentified: false,
                    espConnected: false,
                })

                newWs.send(
                    JSON.stringify({
                        type: 'client_type',
                        clientType: 'browser',
                    })
                )

                newWs.send(
                    JSON.stringify({
                        type: 'identify',
                        deviceId: deviceIdToConnect,
                    })
                )
            }

            newWs.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    console.log('Received message:', data)

                    if (data.type === 'system' && data.status === 'connected') {
                        get().setSocketStatus({
                            isIdentified: true,
                        })
                    } else if (data.type === 'esp_status') {
                        get().setSocketStatus({
                            espConnected: data.status === 'connected',
                        })
                    }
                } catch (error) {
                    console.error('Error processing message:', error)
                }
            }

            newWs.onclose = () => {
                get().setSocketStatus({
                    isConnected: false,
                    isIdentified: false,
                    espConnected: false,
                })
            }

            newWs.onerror = (error) => {
                console.error('WebSocket error:', error)
            }

            set({ ws: newWs })
        },

        disconnectWebSocket: () => {
            const { ws } = get()
            if (ws) {
                ws.close()
                set({ ws: null })
            }
            set({
                socketStatus: {
                    isConnected: false,
                    isIdentified: false,
                    espConnected: false,
                },
            })
        },
    }))
)