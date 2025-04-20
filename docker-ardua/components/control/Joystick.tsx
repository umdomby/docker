"use client"
import { useCallback, useRef, useEffect, useState } from 'react'

type JoystickProps = {
    motor: 'A' | 'B'
    onChange: (value: number) => void
    direction: 'forward' | 'backward' | 'stop'
    speed: number
    className?: string
}

const Joystick = ({ motor, onChange, direction, speed, className }: JoystickProps) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)
    const touchId = useRef<number | null>(null)
    const [isLandscape, setIsLandscape] = useState(false)

    // Определяем ориентацию устройства
    useEffect(() => {
        const handleOrientationChange = () => {
            setIsLandscape(window.matchMedia("(orientation: landscape)").matches)
        }

        // Проверяем сразу при монтировании
        handleOrientationChange()

        // Добавляем слушатель изменений
        const mediaQuery = window.matchMedia("(orientation: landscape)")
        mediaQuery.addEventListener('change', handleOrientationChange)

        return () => {
            mediaQuery.removeEventListener('change', handleOrientationChange)
        }
    }, [])

    const motorStyles = {
        A: { border: '1px solid #ffffff', left: '10px' },
        B: { border: '1px solid #ffffff', right: '10px' }
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
    }, [onChange])

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
        }

        onChange(0)
    }, [onChange])

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
            className={`noSelect ${className}`}
            style={{
                position: 'absolute',
                width: '80px',
                height: isLandscape ? '95vh' : '45vh',
                top: isLandscape ? '-15%' : '20%',
                transform: isLandscape ? 'translateY(15%)' : '-20%',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                touchAction: 'none',
                userSelect: 'none',
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                ...motorStyles[motor],
                zIndex: 1001
            }}
        >
            <div style={{
                position: 'absolute',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                pointerEvents: 'none',
                transform: `translateY(${
                    direction === 'forward'
                        ? `-${speed * 0.3}px`
                        : direction === 'backward'
                            ? `${speed * 0.3}px`
                            : '0'
                })`,
                transition: 'transform 0.1s ease-out'
            }} />
        </div>
    )
}

export default Joystick