"use client"
import { useCallback, useRef, useEffect, useState } from 'react'

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
    const [windowHeight, setWindowHeight] = useState(0)

    useEffect(() => {
        const handleResize = () => {
            setWindowHeight(window.innerHeight)
        }

        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const motorStyles = {
        A: { border: '1px solid #ffffff' },
        B: { border: '1px solid #ffffff' }
    }

    const positionStyles = {
        A: {
            left: '0',
            right: 'auto',
            marginLeft: '10px'
        },
        B: {
            right: '0',
            left: 'auto',
            marginRight: '10px'
        }
    }

    const updateValue = useCallback((clientY: number) => {
        const container = containerRef.current
        if (!container) return

        const rect = container.getBoundingClientRect()
        const y = clientY - rect.top
        const height = rect.height
        let value = ((height - y) / height) * 510 - 255
        value = Math.max(-255, Math.min(255, value))

        onChange(value)
    }, [motor, onChange])

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
            // container.style.backgroundColor = 'transparent' // эту строку можно оставить или удалить
        }

        onChange(0)
    }, [onChange])

    // Обработчики touch-событий вынесены в отдельные функции
    const onTouchStart = useCallback((e: TouchEvent) => {
        if (touchId.current === null && containerRef.current?.contains(e.target as Node)) {
            const touch = e.changedTouches[0]
            touchId.current = touch.identifier
            handleStart(touch.clientY)
            e.preventDefault()
        }
    }, [handleStart])

    const onTouchMove = useCallback((e: TouchEvent) => {
        if (touchId.current !== null && containerRef.current?.contains(e.target as Node)) {
            const touch = Array.from(e.changedTouches).find(
                t => t.identifier === touchId.current
            )
            if (touch) {
                handleMove(touch.clientY)
                e.preventDefault()
            }
        }
    }, [handleMove])

    const onTouchEnd = useCallback((e: TouchEvent) => {
        if (touchId.current !== null) {
            const touch = Array.from(e.changedTouches).find(
                t => t.identifier === touchId.current
            )
            if (touch) {
                handleEnd()
            }
        }
    }, [handleEnd])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const onMouseDown = (e: MouseEvent) => {
            if (container.contains(e.target as Node)) {
                handleStart(e.clientY)
                e.preventDefault()
            }
        }

        const onMouseMove = (e: MouseEvent) => {
            if (isDragging.current) {
                handleMove(e.clientY)
                e.preventDefault()
            }
        }

        const onMouseUp = () => {
            if (isDragging.current) {
                handleEnd()
            }
        }

        container.addEventListener('touchstart', onTouchStart, { passive: false })
        container.addEventListener('touchmove', onTouchMove, { passive: false })
        container.addEventListener('touchend', onTouchEnd, { passive: false })
        container.addEventListener('touchcancel', onTouchEnd, { passive: false })

        container.addEventListener('mousedown', onMouseDown)
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
        container.addEventListener('mouseleave', handleEnd)

        return () => {
            container.removeEventListener('touchstart', onTouchStart)
            container.removeEventListener('touchmove', onTouchMove)
            container.removeEventListener('touchend', onTouchEnd)
            container.removeEventListener('touchcancel', onTouchEnd)

            container.removeEventListener('mousedown', onMouseDown)
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
            container.removeEventListener('mouseleave', handleEnd)
        }
    }, [handleEnd, handleMove, handleStart, onTouchEnd, onTouchMove, onTouchStart])

    return (
        <div
            ref={containerRef}
            className="noSelect"
            style={{
                position: 'absolute',
                width: '80px',
                height: `${windowHeight * 0.5}px`,
                top: '50%',
                transform: 'translateY(-50%)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                touchAction: 'none',
                userSelect: 'none',
                backgroundColor: 'transparent',
                ...motorStyles[motor],
                ...positionStyles[motor]
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