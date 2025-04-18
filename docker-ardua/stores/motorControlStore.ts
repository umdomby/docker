// stores/motorControlStore.ts
import { create } from 'zustand'

// Тип для состояния мотора
type MotorState = {
    speed: number
    direction: 'forward' | 'backward' | 'stop'
}

// Тип для хранилища управления моторами
type MotorControlStore = {
    motorA: MotorState
    motorB: MotorState
    isReady: boolean
    setMotorA: (value: number) => void
    setMotorB: (value: number) => void
    emergencyStop: () => void
    initialize: () => void
}

// Создаем хранилище Zustand для управления моторами
export const useMotorControl = create<MotorControlStore>((set) => ({
    motorA: { speed: 0, direction: 'stop' },
    motorB: { speed: 0, direction: 'stop' },
    isReady: false,

    // Установка состояния мотора A
    setMotorA: (value) => set((state) => {
        const direction = value > 0 ? 'forward' : value < 0 ? 'backward' : 'stop'
        const speed = Math.abs(value)
        return { motorA: { speed, direction } }
    }),

    // Установка состояния мотора B
    setMotorB: (value) => set((state) => {
        const direction = value > 0 ? 'forward' : value < 0 ? 'backward' : 'stop'
        const speed = Math.abs(value)
        return { motorB: { speed, direction } }
    }),

    // Аварийная остановка обоих моторов
    emergencyStop: () => set({
        motorA: { speed: 0, direction: 'stop' },
        motorB: { speed: 0, direction: 'stop' }
    }),

    // Инициализация хранилища
    initialize: () => set({ isReady: true })
}))