"use client"
import { useCallback, useRef, useEffect } from 'react'

type JoystickProps = {
    motor: 'A' | 'B'
    onChange: (value: number) => void
    direction: 'forward' | 'backward' | 'stop'
    speed: number
}

const Joystick = ({ motor, onChange, direction, speed }: JoystickProps) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)
    const touchId = useRef<number | null>(null)

    // Стили для разных моторов
    const motorStyles = {
        A: { bg: 'rgba(255, 87, 34, 0.2)', border: '2px solid #ff5722' },
        B: { bg: 'rgba(76, 175, 80, 0.2)', border: '2px solid #4caf50' }
    }

    // Обновление значения джойстика
    const updateValue = useCallback((clientY: number) => {
        const container = containerRef.current
        if (!container) return

        const rect = container.getBoundingClientRect()
        const y = clientY - rect.top
        const height = rect.height
        let value = ((height - y) / height) * 510 - 255
        value = Math.max(-255, Math.min(255, value))

        // Изменение цвета фона в зависимости от положения
        const intensity = Math.abs(value) / 255 * 0.3 + 0.2
        container.style.backgroundColor = `rgba(${
            motor === 'A' ? '255, 87, 34' : '76, 175, 80'
        }, ${intensity})`

        onChange(value)
    }, [motor, onChange])

    // Обработчики событий
    const handleStart = useCallback((clientY: number) => {
        isDragging.current = true
        const container = containerRef.current
        if (container) {
            container.style.transition = 'none'
        }
        updateValue(clientY)
    }, [updateValue])

    const handleMove = useCallback((clientY: number) => {
        if (isDragging.current) {
            updateValue(clientY)
        }
    }, [updateValue])

    const handleEnd = useCallback(() => {
        if (!isDragging.current) return
        isDragging.current = false
        touchId.current = null

        const container = containerRef.current
        if (container) {
            container.style.transition = 'background-color 0.3s'
            container.style.backgroundColor = motorStyles[motor].bg
        }

        onChange(0)
    }, [motor, motorStyles, onChange])

    // Подписка на события мыши и тач-устройств
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const onTouchStart = (e: TouchEvent) => {
            if (touchId.current === null) {
                const touch = e.changedTouches[0]
                touchId.current = touch.identifier
                handleStart(touch.clientY)
            }
        }

        const onTouchMove = (e: TouchEvent) => {
            if (touchId.current !== null) {
                const touch = Array.from(e.changedTouches).find(
                    t => t.identifier === touchId.current
                )
                if (touch) {
                    handleMove(touch.clientY)
                }
            }
        }

        const onTouchEnd = (e: TouchEvent) => {
            if (touchId.current !== null) {
                const touch = Array.from(e.changedTouches).find(
                    t => t.identifier === touchId.current
                )
                if (touch) {
                    handleEnd()
                }
            }
        }

        const onMouseDown = (e: MouseEvent) => {
            e.preventDefault()
            handleStart(e.clientY)
        }

        const onMouseMove = (e: MouseEvent) => {
            e.preventDefault()
            handleMove(e.clientY)
        }

        const onMouseUp = () => {
            handleEnd()
        }

        // Добавление слушателей событий
        container.addEventListener('touchstart', onTouchStart, { passive: false })
        container.addEventListener('touchmove', onTouchMove, { passive: false })
        container.addEventListener('touchend', onTouchEnd, { passive: false })
        container.addEventListener('touchcancel', onTouchEnd, { passive: false })

        container.addEventListener('mousedown', onMouseDown)
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
        container.addEventListener('mouseleave', handleEnd)

        // Глобальные обработчики для случаев, когда события не доходят до элемента
        const handleGlobalMouseUp = () => {
            if (isDragging.current) {
                handleEnd()
            }
        }

        const handleGlobalTouchEnd = (e: TouchEvent) => {
            if (isDragging.current && touchId.current !== null) {
                const touch = Array.from(e.changedTouches).find(
                    t => t.identifier === touchId.current
                )
                if (touch) {
                    handleEnd()
                }
            }
        }

        document.addEventListener('mouseup', handleGlobalMouseUp)
        document.addEventListener('touchend', handleGlobalTouchEnd)

        // Очистка слушателей при размонтировании
        return () => {
            container.removeEventListener('touchstart', onTouchStart)
            container.removeEventListener('touchmove', onTouchMove)
            container.removeEventListener('touchend', onTouchEnd)
            container.removeEventListener('touchcancel', onTouchEnd)

            container.removeEventListener('mousedown', onMouseDown)
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
            container.removeEventListener('mouseleave', handleEnd)

            document.removeEventListener('mouseup', handleGlobalMouseUp)
            document.removeEventListener('touchend', handleGlobalTouchEnd)
        }
    }, [handleEnd, handleMove, handleStart])

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: '150px',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                touchAction: 'none',
                userSelect: 'none',
                ...motorStyles[motor]
            }}
        >
            <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '0',
                right: '0',
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#333',
                zIndex: '1'
            }}>
            </div>
        </div>
    )
}

export default Joystick