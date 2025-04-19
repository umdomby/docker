// file: docker-ardua/components/control/Joystick.tsx
"use client"
import { useCallback, useRef, useEffect, useState } from 'react'

type JoystickProps = {
    motor: 'A' | 'B'
    onChange: (value: number) => void
    direction: 'forward' | 'backward' | 'stop'
    speed: number
}

/**
 * Компонент джойстика для управления моторами
 */
const Joystick = ({ motor, onChange, direction, speed }: JoystickProps) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)
    const touchId = useRef<number | null>(null)
    const [windowHeight, setWindowHeight] = useState(0)

    // Обновляем высоту окна при изменении размера
    useEffect(() => {
        const handleResize = () => {
            setWindowHeight(window.innerHeight)
        }

        // Устанавливаем начальное значение
        handleResize()

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Стили для разных моторов
    const motorStyles = {
        A: { border: '1px solid #ffffff' },
        B: { border: '1px solid #ffffff' }
    }

    // Позиционирование в зависимости от мотора
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

    // Обновление значения джойстика
    const updateValue = useCallback((clientY: number) => {
        const container = containerRef.current
        if (!container) return

        const rect = container.getBoundingClientRect()
        const y = clientY - rect.top
        const height = rect.height
        let value = ((height - y) / height) * 510 - 255
        value = Math.max(-255, Math.min(255, value))

        // Изменение цвета в зависимости от положения
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
            container.style.backgroundColor = 'transparent'
        }

        onChange(0)
    }, [onChange])

    // Подписка на события
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const onTouchStart = (e: TouchEvent) => {
            e.preventDefault(); // Добавьте эту строку
            if (touchId.current === null) {
                const touch = e.changedTouches[0];
                touchId.current = touch.identifier;
                handleStart(touch.clientY);
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            e.preventDefault(); // Добавьте эту строку
            if (touchId.current !== null) {
                const touch = Array.from(e.changedTouches).find(
                    t => t.identifier === touchId.current
                );
                if (touch) {
                    handleMove(touch.clientY);
                }
            }
        };

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

        // И в обработчиках мыши
        const onMouseDown = (e: MouseEvent) => {
            e.preventDefault();
            handleStart(e.clientY);
        };

        const onMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            handleMove(e.clientY);
        };

        const onMouseUp = () => {
            handleEnd()
        }

        // Добавление обработчиков
        container.addEventListener('touchstart', onTouchStart, { passive: false })
        container.addEventListener('touchmove', onTouchMove, { passive: false })
        container.addEventListener('touchend', onTouchEnd, { passive: false })
        container.addEventListener('touchcancel', onTouchEnd, { passive: false })

        container.addEventListener('mousedown', onMouseDown)
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
        container.addEventListener('mouseleave', handleEnd)

        // Глобальные обработчики
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

        // Очистка
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
            className="noSelect" // Добавьте этот класс
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