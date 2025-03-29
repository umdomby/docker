"use client"
import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

type MessageType = {
    type?: string
    command?: string
    deviceId?: string
    message?: string
    params?: any
    clientId?: number
    status?: string
    timestamp?: string
    origin?: 'client' | 'esp' | 'server' | 'error'
    reason?: string
}

type LogEntry = {
    message: string
    type: 'client' | 'esp' | 'server' | 'error'
}

const Joystick = ({
                      motor,
                      onChange,
                      direction,
                      speed
                  }: {
    motor: 'A' | 'B'
    onChange: (value: number) => void
    direction: 'forward' | 'backward' | 'stop'
    speed: number
}) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)
    const touchId = useRef<number | null>(null)

    const motorStyles = {
        A: { bg: 'rgba(255, 87, 34, 0.2)', border: '2px solid #ff5722' },
        B: { bg: 'rgba(76, 175, 80, 0.2)', border: '2px solid #4caf50' }
    }

    const updateValue = useCallback((clientY: number) => {
        const container = containerRef.current
        if (!container) return

        const rect = container.getBoundingClientRect()
        const y = clientY - rect.top
        const height = rect.height
        let value = ((height - y) / height) * 510 - 255
        value = Math.max(-255, Math.min(255, value))

        const intensity = Math.abs(value) / 255 * 0.3 + 0.2
        container.style.backgroundColor = `rgba(${
            motor === 'A' ? '255, 87, 34' : '76, 175, 80'
        }, ${intensity})`

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
            container.style.backgroundColor = motorStyles[motor].bg
        }
        onChange(0)
    }, [motor, motorStyles, onChange])

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
    }, [handleEnd, handleMove, handleStart])

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: '200px',
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
                {direction !== 'stop' ? (
                    <span>{direction === 'forward' ? '↑' : '↓'} {speed}</span>
                ) : (
                    <span>Motor {motor}</span>
                )}
            </div>
        </div>
    )
}

export default function WebsocketController() {
    const [log, setLog] = useState<LogEntry[]>([])
    const [isConnected, setIsConnected] = useState(false)
    const [isIdentified, setIsIdentified] = useState(false)
    const [deviceId, setDeviceId] = useState('123')
    const [inputDeviceId, setInputDeviceId] = useState('123')
    const [espConnected, setEspConnected] = useState(false)
    const [controlVisible, setControlVisible] = useState(false)
    const [motorASpeed, setMotorASpeed] = useState(0)
    const [motorBSpeed, setMotorBSpeed] = useState(0)
    const [motorADirection, setMotorADirection] = useState<'forward' | 'backward' | 'stop'>('stop')
    const [motorBDirection, setMotorBDirection] = useState<'forward' | 'backward' | 'stop'>('stop')

    const socketRef = useRef<WebSocket | null>(null)
    const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const addLog = useCallback((msg: string, type: LogEntry['type']) => {
        setLog(prev => [...prev.slice(-100), {message: `${new Date().toLocaleTimeString()}: ${msg}`, type}])
    }, [])

    const sendCommand = useCallback((command: string, params?: any) => {
        if (!isIdentified) {
            addLog("Cannot send command: not identified", 'error')
            return
        }

        if (socketRef.current?.readyState === WebSocket.OPEN) {
            const msg = JSON.stringify({
                command,
                params,
                deviceId,
                timestamp: Date.now(),
                expectAck: true
            })

            socketRef.current.send(msg)
            addLog(`Sent command to ${deviceId}: ${command}`, 'client')

            if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current)
            commandTimeoutRef.current = setTimeout(() => {
                if (espConnected) {
                    addLog(`Command ${command} not acknowledged by ESP`, 'error')
                    setEspConnected(false)
                }
            }, 5000)
        } else {
            addLog("WebSocket not ready!", 'error')
        }
    }, [addLog, deviceId, isIdentified, espConnected])

    const handleMotorAControl = useCallback((speed: number, direction: 'forward' | 'backward' | 'stop') => {
        setMotorASpeed(Math.abs(speed))
        setMotorADirection(direction)

        // Мгновенная отправка команд
        if (direction === 'stop') {
            sendCommand("set_speed", { motor: 'A', speed: 0 })
        } else {
            sendCommand("set_speed", { motor: 'A', speed: Math.abs(speed) })
            sendCommand(direction === 'forward' ? "motor_a_forward" : "motor_a_backward")
        }
    }, [sendCommand])

    const handleMotorBControl = useCallback((speed: number, direction: 'forward' | 'backward' | 'stop') => {
        setMotorBSpeed(Math.abs(speed))
        setMotorBDirection(direction)

        // Мгновенная отправка команд
        if (direction === 'stop') {
            sendCommand("set_speed", { motor: 'B', speed: 0 })
        } else {
            sendCommand("set_speed", { motor: 'B', speed: Math.abs(speed) })
            sendCommand(direction === 'forward' ? "motor_b_forward" : "motor_b_backward")
        }
    }, [sendCommand])

    const connectWebSocket = useCallback(() => {
        if (socketRef.current) socketRef.current.close()

        const ws = new WebSocket('wss://ardu.site/ws')

        ws.onopen = () => {
            setIsConnected(true)
            addLog("Connected to WebSocket server", 'server')
            ws.send(JSON.stringify({ type: 'client_type', clientType: 'browser' }))
            ws.send(JSON.stringify({ type: 'identify', deviceId: inputDeviceId }))
        }

        ws.onmessage = (event) => {
            try {
                const data: MessageType = JSON.parse(event.data)
                if (data.type === "system" && data.status === "connected") {
                    setIsIdentified(true)
                    setDeviceId(inputDeviceId)
                }
                if (data.type === "esp_status") setEspConnected(data.status === "connected")
                addLog(`${data.type === "error" ? "Error" : data.type === "log" ? "ESP" : "Server"}: ${data.message || data.status}`,
                    data.type === "error" ? 'error' : data.type === "log" ? 'esp' : 'server')
            } catch (error) {
                addLog(`Invalid message: ${event.data}`, 'error')
            }
        }

        ws.onclose = () => {
            setIsConnected(false)
            setIsIdentified(false)
            setEspConnected(false)
            addLog("Disconnected from server", 'server')
        }

        ws.onerror = (error) => {
            addLog(`WebSocket error: ${error.type}`, 'error')
        }

        socketRef.current = ws
    }, [addLog, inputDeviceId])

    const disconnectWebSocket = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close()
            setIsConnected(false)
            setIsIdentified(false)
            setEspConnected(false)
            addLog("Disconnected manually", 'server')
        }
    }, [addLog])

    useEffect(() => {
        return () => {
            if (socketRef.current) socketRef.current.close()
            if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current)
        }
    }, [])

    useEffect(() => {
        const interval = setInterval(() => {
            if (isConnected && isIdentified) sendCommand("heartbeat2")
        }, 1000)
        return () => clearInterval(interval)
    }, [isConnected, isIdentified, sendCommand])

    return (
        <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '20px',
            fontFamily: 'Arial'
        }}>
            <h1>ESP8266 WebSocket Control</h1>

            <div style={{
                margin: '10px 0',
                padding: '10px',
                background: isConnected ? (isIdentified ? (espConnected ? '#e6f7e6' : '#fff3e0') : '#fff3e0') : '#ffebee',
                border: `1px solid ${isConnected ? (isIdentified ? (espConnected ? '#4caf50' : '#ffa000') : '#ffa000') : '#f44336'}`,
                borderRadius: '4px'
            }}>
                Status: {isConnected ? (isIdentified ? `✅ Connected (ESP: ${espConnected ? '✅' : '❌'})` : "🟡 Connecting") : "❌ Disconnected"}
            </div>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                margin: '15px 0',
                padding: '15px',
                background: '#f5f5f5',
                borderRadius: '8px'
            }}>
                <input
                    type="text"
                    placeholder="Device ID"
                    value={inputDeviceId}
                    onChange={(e) => setInputDeviceId(e.target.value)}
                    disabled={isConnected}
                    style={{
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                    }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={connectWebSocket}
                        disabled={isConnected}
                        style={{
                            padding: '10px 15px',
                            background: '#2196f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            flex: 1
                        }}
                    >
                        Connect
                    </button>
                    <button
                        onClick={disconnectWebSocket}
                        disabled={!isConnected}
                        style={{
                            padding: '10px 15px',
                            background: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            flex: 1
                        }}
                    >
                        Disconnect
                    </button>
                </div>
            </div>

            <Dialog open={controlVisible} onOpenChange={setControlVisible}>
                <DialogTrigger asChild>
                    <Button onClick={() => setControlVisible(!controlVisible)}>
                        {controlVisible ? "Hide Controls" : "Show Controls"}
                    </Button>
                </DialogTrigger>
                <DialogContent style={{
                    width: '100%',
                    maxWidth: '100%',
                    height: '80vh',
                    maxHeight: '80vh',
                    padding: '20px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <DialogHeader>
                        <DialogTitle style={{ textAlign: 'center' }}>Motor Controls</DialogTitle>
                    </DialogHeader>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'row', // Всегда горизонтальное расположение
                        gap: '20px',
                        flex: 1,
                        minHeight: '300px',
                        overflow: 'auto'
                    }}>
                        <div style={{
                            flex: 1,
                            height: '70%',
                            minHeight: '200px'
                        }}>
                            <Joystick
                                motor="A"
                                onChange={(value) => {
                                    if (value > 0) handleMotorAControl(value, 'forward')
                                    else if (value < 0) handleMotorAControl(-value, 'backward')
                                    else handleMotorAControl(0, 'stop')
                                }}
                                direction={motorADirection}
                                speed={motorASpeed}
                            />
                        </div>

                        <div style={{
                            flex: 1,
                            height: '70%',
                            minHeight: '200px'
                        }}>
                            <Joystick
                                motor="B"
                                onChange={(value) => {
                                    if (value > 0) handleMotorBControl(value, 'forward')
                                    else if (value < 0) handleMotorBControl(-value, 'backward')
                                    else handleMotorBControl(0, 'stop')
                                }}
                                direction={motorBDirection}
                                speed={motorBSpeed}
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <div style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                overflow: 'hidden',
                marginTop: '20px'
            }}>
                <h3 style={{ padding: '10px', background: '#eee', margin: 0 }}>Event Log</h3>
                <div style={{
                    height: '300px',
                    overflowY: 'auto',
                    padding: '10px',
                    background: '#fafafa'
                }}>
                    {log.slice().reverse().map((entry, index) => (
                        <div key={index} style={{
                            margin: '5px 0',
                            padding: '5px',
                            borderBottom: '1px solid #eee',
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            color:
                                entry.type === 'client' ? '#2196F3' :
                                    entry.type === 'esp' ? '#4CAF50' :
                                        entry.type === 'server' ? '#9C27B0' : '#F44336',
                            fontWeight: entry.type === 'error' ? 'bold' : 'normal'
                        }}>
                            {entry.message}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}