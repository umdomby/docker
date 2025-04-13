"use client"
import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogClose,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {VisuallyHidden} from "@radix-ui/react-visually-hidden";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

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

export default function WebsocketController() {
    const [log, setLog] = useState<LogEntry[]>([])
    const [isConnected, setIsConnected] = useState(false)
    const [isIdentified, setIsIdentified] = useState(false)
    const [deviceId, setDeviceId] = useState('123')
    const [inputDeviceId, setInputDeviceId] = useState('123')
    const [newDeviceId, setNewDeviceId] = useState('')
    const [deviceList, setDeviceList] = useState<string[]>(['123'])
    const [espConnected, setEspConnected] = useState(false)
    const [controlVisible, setControlVisible] = useState(false)
    const [logVisible, setLogVisible] = useState(false)
    const [motorASpeed, setMotorASpeed] = useState(0)
    const [motorBSpeed, setMotorBSpeed] = useState(0)
    const [motorADirection, setMotorADirection] = useState<'forward' | 'backward' | 'stop'>('stop')
    const [motorBDirection, setMotorBDirection] = useState<'forward' | 'backward' | 'stop'>('stop')
    const [isLandscape, setIsLandscape] = useState(false)
    const [autoReconnect, setAutoReconnect] = useState(false)

    const reconnectAttemptRef = useRef(0)
    const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
    const socketRef = useRef<WebSocket | null>(null)
    const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const lastMotorACommandRef = useRef<{speed: number, direction: 'forward' | 'backward' | 'stop'} | null>(null)
    const lastMotorBCommandRef = useRef<{speed: number, direction: 'forward' | 'backward' | 'stop'} | null>(null)
    const motorAThrottleRef = useRef<NodeJS.Timeout | null>(null)
    const motorBThrottleRef = useRef<NodeJS.Timeout | null>(null)
    const currentDeviceIdRef = useRef(inputDeviceId)

    useEffect(() => {
        currentDeviceIdRef.current = inputDeviceId
    }, [inputDeviceId])

    useEffect(() => {
        const savedDevices = localStorage.getItem('espDeviceList')
        if (savedDevices) {
            const devices = JSON.parse(savedDevices)
            setDeviceList(devices)
            if (devices.length > 0) {
                setInputDeviceId(devices[0])
                setDeviceId(devices[0])
                currentDeviceIdRef.current = devices[0]
            }
        }

        const savedAutoReconnect = localStorage.getItem('autoReconnect')
        if (savedAutoReconnect) {
            setAutoReconnect(savedAutoReconnect === 'true')
        }
    }, [])

    const saveNewDeviceId = useCallback(() => {
        if (newDeviceId && !deviceList.includes(newDeviceId)) {
            const updatedList = [...deviceList, newDeviceId]
            setDeviceList(updatedList)
            localStorage.setItem('espDeviceList', JSON.stringify(updatedList))
            setInputDeviceId(newDeviceId)
            setNewDeviceId('')
            currentDeviceIdRef.current = newDeviceId
        }
    }, [newDeviceId, deviceList])

    const addLog = useCallback((msg: string, type: LogEntry['type']) => {
        setLog(prev => [...prev.slice(-100), {message: `${new Date().toLocaleTimeString()}: ${msg}`, type}])
    }, [])

    const cleanupWebSocket = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.onopen = null
            socketRef.current.onclose = null
            socketRef.current.onmessage = null
            socketRef.current.onerror = null
            if (socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.close()
            }
            socketRef.current = null
        }
    }, [])

    const connectWebSocket = useCallback((deviceIdToConnect: string) => {
        cleanupWebSocket()

        reconnectAttemptRef.current = 0
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current)
            reconnectTimerRef.current = null
        }

        const ws = new WebSocket('wss://ardu.site/ws')

        ws.onopen = () => {
            setIsConnected(true)
            reconnectAttemptRef.current = 0
            addLog("Connected to WebSocket server", 'server')

            ws.send(JSON.stringify({
                type: 'client_type',
                clientType: 'browser'
            }))

            ws.send(JSON.stringify({
                type: 'identify',
                deviceId: deviceIdToConnect
            }))
        }

        ws.onmessage = (event) => {
            try {
                const data: MessageType = JSON.parse(event.data)
                console.log("Received message:", data)

                if (data.type === "system") {
                    if (data.status === "connected") {
                        setIsIdentified(true)
                        setDeviceId(deviceIdToConnect)
                    }
                    addLog(`System: ${data.message}`, 'server')
                }
                else if (data.type === "error") {
                    addLog(`Error: ${data.message}`, 'error')
                    setIsIdentified(false)
                }
                else if (data.type === "log") {
                    addLog(`ESP: ${data.message}`, 'esp')
                    if (data.message && data.message.includes("Heartbeat")) {
                        setEspConnected(true)
                    }
                }
                else if (data.type === "esp_status") {
                    console.log(`Received ESP status: ${data.status}`)
                    setEspConnected(data.status === "connected")
                    addLog(`ESP ${data.status === "connected" ? "✅ Connected" : "❌ Disconnected"}${data.reason ? ` (${data.reason})` : ''}`,
                        data.status === "connected" ? 'esp' : 'error')
                }
                else if (data.type === "command_ack") {
                    if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current)
                    addLog(`ESP executed command: ${data.command}`, 'esp')
                }
                else if (data.type === "command_status") {
                    addLog(`Command ${data.command} delivered to ESP`, 'server')
                }
            } catch (error) {
                console.error("Error processing message:", error)
                addLog(`Received invalid message: ${event.data}`, 'error')
            }
        }

        ws.onclose = (event) => {
            setIsConnected(false)
            setIsIdentified(false)
            setEspConnected(false)
            addLog(`Disconnected from server${event.reason ? `: ${event.reason}` : ''}`, 'server')

            if (reconnectAttemptRef.current < 5) {
                reconnectAttemptRef.current += 1
                const delay = Math.min(5000, reconnectAttemptRef.current * 1000)
                addLog(`Attempting to reconnect in ${delay/1000} seconds... (attempt ${reconnectAttemptRef.current})`, 'server')

                reconnectTimerRef.current = setTimeout(() => {
                    connectWebSocket(currentDeviceIdRef.current)
                }, delay)
            } else {
                addLog("Max reconnection attempts reached", 'error')
            }
        }

        ws.onerror = (error) => {
            addLog(`WebSocket error: ${error.type}`, 'error')
        }

        socketRef.current = ws
    }, [addLog, cleanupWebSocket])

    const disconnectWebSocket = useCallback(() => {
        return new Promise<void>((resolve) => {
            cleanupWebSocket()
            setIsConnected(false)
            setIsIdentified(false)
            setEspConnected(false)
            addLog("Disconnected manually", 'server')
            reconnectAttemptRef.current = 5

            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current)
                reconnectTimerRef.current = null
            }
            resolve()
        })
    }, [addLog, cleanupWebSocket])

    const handleDeviceChange = useCallback(async (value: string) => {
        setInputDeviceId(value)
        currentDeviceIdRef.current = value

        if (autoReconnect) {
            await disconnectWebSocket()
            connectWebSocket(value)
        }
    }, [autoReconnect, disconnectWebSocket, connectWebSocket])

    const toggleAutoReconnect = useCallback((checked: boolean) => {
        setAutoReconnect(checked)
        localStorage.setItem('autoReconnect', checked.toString())
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

    const createMotorHandler = useCallback((motor: 'A' | 'B') => {
        const lastCommandRef = motor === 'A' ? lastMotorACommandRef : lastMotorBCommandRef
        const throttleRef = motor === 'A' ? motorAThrottleRef : motorBThrottleRef
        const setSpeed = motor === 'A' ? setMotorASpeed : setMotorBSpeed
        const setDirection = motor === 'A' ? setMotorADirection : setMotorBDirection

        return (value: number) => {
            let direction: 'forward' | 'backward' | 'stop' = 'stop'
            let speed = 0

            if (value > 0) {
                direction = 'forward'
                speed = value
            } else if (value < 0) {
                direction = 'backward'
                speed = -value
            }

            setSpeed(speed)
            setDirection(direction)

            const currentCommand = { speed, direction }
            if (JSON.stringify(lastCommandRef.current) === JSON.stringify(currentCommand)) {
                return
            }

            lastCommandRef.current = currentCommand

            if (throttleRef.current) {
                clearTimeout(throttleRef.current)
            }

            if (speed === 0) {
                sendCommand("set_speed", { motor, speed: 0 })
                return
            }

            throttleRef.current = setTimeout(() => {
                sendCommand("set_speed", { motor, speed })
                sendCommand(direction === 'forward'
                    ? `motor_${motor.toLowerCase()}_forward`
                    : `motor_${motor.toLowerCase()}_backward`)
            }, 40)
        }
    }, [sendCommand])

    const handleMotorAControl = createMotorHandler('A')
    const handleMotorBControl = createMotorHandler('B')

    const emergencyStop = useCallback(() => {
        sendCommand("set_speed", { motor: 'A', speed: 0 })
        sendCommand("set_speed", { motor: 'B', speed: 0 })
        setMotorASpeed(0)
        setMotorBSpeed(0)
        setMotorADirection('stop')
        setMotorBDirection('stop')

        if (motorAThrottleRef.current) clearTimeout(motorAThrottleRef.current)
        if (motorBThrottleRef.current) clearTimeout(motorBThrottleRef.current)
    }, [sendCommand])

    useEffect(() => {
        const checkOrientation = () => {
            setIsLandscape(window.innerWidth > window.innerHeight)
        }

        checkOrientation()
        window.addEventListener('resize', checkOrientation)
        return () => window.removeEventListener('resize', checkOrientation)
    }, [])

    useEffect(() => {
        return () => {
            cleanupWebSocket()
            if (motorAThrottleRef.current) clearTimeout(motorAThrottleRef.current)
            if (motorBThrottleRef.current) clearTimeout(motorBThrottleRef.current)
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
        }
    }, [cleanupWebSocket])

    useEffect(() => {
        const interval = setInterval(() => {
            if (isConnected && isIdentified) sendCommand("heartbeat2")
        }, 1000)
        return () => clearInterval(interval)
    }, [isConnected, isIdentified, sendCommand])

    const statusColor = isConnected
        ? (isIdentified
            ? (espConnected ? 'bg-green-500' : 'bg-yellow-500')
            : 'bg-yellow-500')
        : 'bg-red-500'

    return (
        <div className="p-2 space-y-2 max-w-full">
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                <h1 className="text-lg font-bold">ESP8266 Control</h1>

                <div className={`w-3 h-3 rounded-full ${isConnected ? (isIdentified ? (espConnected ? 'bg-green-500' : 'bg-yellow-500') : 'bg-yellow-500') : 'bg-red-500'}`}
                     title={isConnected ? (isIdentified ? (espConnected ? 'Connected & Identified' : 'Connected (ESP not connected)') : 'Connected (Pending)') : 'Disconnected'}>
                </div>

                <div className="flex items-center space-x-2">
                    <Select value={inputDeviceId} onValueChange={handleDeviceChange}>
                        <SelectTrigger className="w-[100px] h-8">
                            <SelectValue placeholder="Device ID" />
                        </SelectTrigger>
                        <SelectContent>
                            {deviceList.map(id => (
                                <SelectItem key={id} value={id}>{id}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Input
                        value={newDeviceId}
                        onChange={(e) => setNewDeviceId(e.target.value)}
                        placeholder="New ID"
                        className="w-[80px] h-8"
                    />
                    <Button
                        onClick={saveNewDeviceId}
                        size="sm"
                        className="h-8"
                        disabled={!newDeviceId}
                    >
                        Add
                    </Button>
                </div>

                <Button
                    onClick={() => connectWebSocket(currentDeviceIdRef.current)}
                    disabled={isConnected}
                    size="sm"
                    className="h-8"
                >
                    Connect
                </Button>

                <Button
                    onClick={disconnectWebSocket}
                    disabled={!isConnected}
                    size="sm"
                    variant="destructive"
                    className="h-8"
                >
                    Disconnect
                </Button>

                <Button
                    onClick={emergencyStop}
                    disabled={!isConnected || !isIdentified}
                    size="sm"
                    variant="outline"
                    className="h-8"
                    title="Immediately stops both motors by sending zero speed commands"
                >
                    E-Stop
                </Button>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="auto-reconnect"
                        checked={autoReconnect}
                        onCheckedChange={toggleAutoReconnect}
                    />
                    <Label htmlFor="auto-reconnect">Auto reconnect</Label>
                </div>

                <Dialog open={controlVisible} onOpenChange={setControlVisible}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setControlVisible(!controlVisible)}>
                            {controlVisible ? "Hide Controls" : "Show Controls"}
                        </Button>
                    </DialogTrigger>
                    <DialogContent style={{
                        width: '100%',
                        height: '80vh',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'stretch',
                        gap: 0
                    }}>
                        <DialogHeader>
                            <DialogTitle></DialogTitle>
                        </DialogHeader>

                        <DialogClose className="absolute left-1/2 -translate-x-1/2">
                            X
                        </DialogClose>

                        {/* Левый сенсор (A) */}
                        <div className="flex w-full justify-between">
                            <div className="w-[calc(50%-10px)] h-[50%] mt-[12%] landscape:h-[70%]">
                                <Joystick
                                    motor="A"
                                    onChange={(value) => {
                                        handleMotorAControl(value)
                                    }}
                                    direction={motorADirection}
                                    speed={motorASpeed}
                                />
                            </div>

                            {/* Правый сенсор (B) */}
                            <div className="w-[calc(50%-10px)] h-[50%] mt-[12%] landscape:h-[70%]">
                                <Joystick
                                    motor="B"
                                    onChange={(value) => {
                                        handleMotorBControl(value)
                                    }}
                                    direction={motorBDirection}
                                    speed={motorBSpeed}
                                />
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => setLogVisible(!logVisible)}
                >
                    {logVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span className="ml-1">Logs</span>
                </Button>
            </div>

            {logVisible && (
                <div className="border rounded-md overflow-hidden">
                    <div className="h-[100px] overflow-y-auto p-1 bg-gray-50 text-xs">
                        {log.slice().reverse().map((entry, index) => (
                            <div key={index} className={`truncate ${
                                entry.type === 'client' ? 'text-blue-500' :
                                    entry.type === 'esp' ? 'text-green-500' :
                                        entry.type === 'server' ? 'text-purple-500' : 'text-red-500 font-bold'
                            }`}>
                                {entry.message}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}