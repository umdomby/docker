import { create } from 'zustand'

type MotorState = {
    speed: number
    direction: 'forward' | 'backward' | 'stop'
}

type MotorControlStore = {
    motorA: MotorState
    motorB: MotorState
    isReady: boolean
    registerSocket: (socket: WebSocket | null) => () => void
    setMotorA: (value: number) => void
    setMotorB: (value: number) => void
    emergencyStop: () => void
    initialize: () => void
    _sendCommand: (command: string, params?: any) => void
}

export const useMotorControl = create<MotorControlStore>((set, get) => {
    let currentSocket: WebSocket | null = null

    return {
        motorA: { speed: 0, direction: 'stop' },
        motorB: { speed: 0, direction: 'stop' },
        isReady: false,

        registerSocket: (socket) => {
            currentSocket = socket
            return () => {
                currentSocket = null
            }
        },

        _sendCommand: (command, params) => {
            if (currentSocket?.readyState === WebSocket.OPEN) {
                const message = JSON.stringify({
                    command,
                    params,
                    timestamp: Date.now()
                })
                currentSocket.send(message)
                console.log('Command sent:', command, params)
            } else {
                console.warn('WebSocket not ready, command not sent:', command)
            }
        },

        setMotorA: (value) => {
            const speed = Math.abs(value)
            const direction = value > 0 ? 'forward' : value < 0 ? 'backward' : 'stop'

            set({
                motorA: { speed, direction }
            })

            const { _sendCommand } = get()
            if (value === 0) {
                _sendCommand("set_speed", { motor: 'A', speed: 0 })
            } else {
                _sendCommand("set_speed", { motor: 'A', speed })
                _sendCommand(`motor_a_${direction}`)
            }
        },

        setMotorB: (value) => {
            const speed = Math.abs(value)
            const direction = value > 0 ? 'forward' : value < 0 ? 'backward' : 'stop'

            set({
                motorB: { speed, direction }
            })

            const { _sendCommand } = get()
            if (value === 0) {
                _sendCommand("set_speed", { motor: 'B', speed: 0 })
            } else {
                _sendCommand("set_speed", { motor: 'B', speed })
                _sendCommand(`motor_b_${direction}`)
            }
        },

        emergencyStop: () => {
            const { _sendCommand } = get()
            _sendCommand("set_speed", { motor: 'A', speed: 0 })
            _sendCommand("set_speed", { motor: 'B', speed: 0 })
            set({
                motorA: { speed: 0, direction: 'stop' },
                motorB: { speed: 0, direction: 'stop' }
            })
        },

        initialize: () => set({ isReady: true })
    }
})