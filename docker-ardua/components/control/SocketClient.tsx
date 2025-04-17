"use client"
import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogClose,
    DialogContent, DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import Joystick from './Joystick'
import styles from './styles.module.css'

// Типы данных
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

export default function SocketClient() {
    // Состояния
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
    const [panelVisible, setPanelVisible] = useState(false) // Новое состояние для панели
    const [motorASpeed, setMotorASpeed] = useState(0)
    const [motorBSpeed, setMotorBSpeed] = useState(0)
    const [motorADirection, setMotorADirection] = useState<'forward' | 'backward' | 'stop'>('stop')
    const [motorBDirection, setMotorBDirection] = useState<'forward' | 'backward' | 'stop'>('stop')
    const [autoReconnect, setAutoReconnect] = useState(false)
    const [autoConnect, setAutoConnect] = useState(false)

    // Рефы
    const reconnectAttemptRef = useRef(0)
    const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
    const socketRef = useRef<WebSocket | null>(null)
    const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const currentDeviceIdRef = useRef(inputDeviceId)

    // Эффект для сохранения deviceId в ref
    useEffect(() => {
        currentDeviceIdRef.current = inputDeviceId
    }, [inputDeviceId])

    // Загрузка сохраненных данных при монтировании
    useEffect(() => {
        const savedDevices = localStorage.getItem('espDeviceList')
        if (savedDevices) {
            const devices = JSON.parse(savedDevices)
            setDeviceList(devices)
            if (devices.length > 0) {
                const savedDeviceId = localStorage.getItem('selectedDeviceId')
                const initialDeviceId = savedDeviceId && devices.includes(savedDeviceId)
                    ? savedDeviceId
                    : devices[0]
                setInputDeviceId(initialDeviceId)
                setDeviceId(initialDeviceId)
                currentDeviceIdRef.current = initialDeviceId
            }
        }

        const savedAutoReconnect = localStorage.getItem('autoReconnect')
        if (savedAutoReconnect) {
            setAutoReconnect(savedAutoReconnect === 'true')
        }

        const savedAutoConnect = localStorage.getItem('autoConnect')
        if (savedAutoConnect) {
            setAutoConnect(savedAutoConnect === 'true')
        }

        // Восстановление состояния панели из localStorage
        const savedPanelState = localStorage.getItem('controlPanelVisible')
        if (savedPanelState) {
            setPanelVisible(savedPanelState === 'true')
        }
    }, [])

    // Сохранение нового deviceId
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

    // Добавление записи в лог
    const addLog = useCallback((msg: string, type: LogEntry['type']) => {
        setLog(prev => [...prev.slice(-100), {message: `${new Date().toLocaleTimeString()}: ${msg}`, type}])
    }, [])

    // Очистка WebSocket соединения
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

    // Подключение к WebSocket
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

    // Автоподключение при изменении autoConnect
    useEffect(() => {
        if (autoConnect && !isConnected) {
            connectWebSocket(currentDeviceIdRef.current)
        }
    }, [autoConnect, connectWebSocket, isConnected])

    // Обработчик изменения autoConnect
    const handleAutoConnectChange = useCallback((checked: boolean) => {
        setAutoConnect(checked)
        localStorage.setItem('autoConnect', checked.toString())
    }, [])

    // Отключение от WebSocket
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

    // Изменение deviceId
    const handleDeviceChange = useCallback(async (value: string) => {
        setInputDeviceId(value)
        currentDeviceIdRef.current = value
        localStorage.setItem('selectedDeviceId', value)

        if (autoReconnect) {
            await disconnectWebSocket()
            connectWebSocket(value)
        }
    }, [autoReconnect, disconnectWebSocket, connectWebSocket])

    // Переключение autoReconnect
    const toggleAutoReconnect = useCallback((checked: boolean) => {
        setAutoReconnect(checked)
        localStorage.setItem('autoReconnect', checked.toString())
    }, [])

    // Отправка команды
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

    // Аварийная остановка
    const emergencyStop = useCallback(() => {
        sendCommand("set_speed", { motor: 'A', speed: 0 })
        sendCommand("set_speed", { motor: 'B', speed: 0 })
        setMotorASpeed(0)
        setMotorBSpeed(0)
        setMotorADirection('stop')
        setMotorBDirection('stop')
    }, [sendCommand])

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            cleanupWebSocket()
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
        }
    }, [cleanupWebSocket])

    // Heartbeat
    useEffect(() => {
        const interval = setInterval(() => {
            if (isConnected && isIdentified) sendCommand("heartbeat2")
        }, 1000)
        return () => clearInterval(interval)
    }, [isConnected, isIdentified, sendCommand])

    // Переключение видимости панели
    const togglePanel = useCallback(() => {
        const newState = !panelVisible
        setPanelVisible(newState)
        localStorage.setItem('controlPanelVisible', newState.toString())
    }, [panelVisible])

    return (
        <div className="p-2 space-y-2 max-w-full">
            {/* Заголовок и статус */}
            <div className={styles.controlPanel}>
                <div
                    className={styles.header}
                    onClick={togglePanel}
                    aria-expanded={panelVisible}
                >
                    <div className="flex items-center">
            <span
                className={styles.statusIndicator}
                style={{
                    backgroundColor: isConnected
                        ? (isIdentified
                            ? (espConnected ? '#4CAF50' : '#FFC107')
                            : '#FFC107')
                        : '#F44336'
                }}
            />
                        <h1 className="text-lg font-bold">ESP8266 Control</h1>
                    </div>
                    <ChevronDown
                        className={`${styles.chevron} ${panelVisible ? styles.rotated : ''}`}
                        size={20}
                    />
                </div>

                {/* Скрываемый контент */}
                <div className={`${styles.hiddenContent} ${panelVisible ? styles.visible : ''}`}>
                    <div className={styles.controlsGrid}>
                        {/* Управление устройством */}
                        <div className="flex items-center space-x-2">
                            <Select
                                value={inputDeviceId}
                                onValueChange={handleDeviceChange}
                                disabled={isConnected && !autoReconnect}
                            >
                                <SelectTrigger className="w-[100px] h-8">
                                    <SelectValue placeholder="Device ID"/>
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

                        {/* Кнопки подключения */}
                        <div className="flex space-x-2">
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
                                disabled={!isConnected || autoConnect}
                                size="sm"
                                variant="destructive"
                                className="h-8"
                            >
                                Disconnect
                            </Button>
                        </div>

                        {/* Настройки */}
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="auto-reconnect"
                                checked={autoReconnect}
                                onCheckedChange={toggleAutoReconnect}
                            />
                            <Label htmlFor="auto-reconnect">Auto reconnect</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="auto-connect"
                                checked={autoConnect}
                                onCheckedChange={handleAutoConnectChange}
                            />
                            <Label htmlFor="auto-connect">Auto connect</Label>
                        </div>
                    </div>

                    {/* Управление моторами */}
                    <Dialog open={controlVisible} onOpenChange={setControlVisible}>
                        <DialogTrigger asChild>
                            <Button
                                className="mt-2"
                                onClick={() => setControlVisible(!controlVisible)}
                            >
                                {controlVisible ? "Hide Controls" : "Show Controls"}
                            </Button>
                        </DialogTrigger>
                        <DialogContent style={{
                            width: '100%',
                            height: '80vh',
                            padding: 0,
                            margin: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            alignItems: 'stretch',
                            gap: 0
                        }}>
                            <DialogHeader>
                                <DialogTitle>Motor Control</DialogTitle>
                            </DialogHeader>

                            <div className="flex w-full justify-between" style={{ flex: 1 }}>
                                <div className="w-[calc(50%-10px)] h-[50%] mt-[12%]">
                                    <Joystick
                                        motor="A"
                                        onChange={(value) => {
                                            let direction: 'forward' | 'backward' | 'stop' = 'stop'
                                            let speed = 0

                                            if (value > 0) {
                                                direction = 'forward'
                                                speed = value
                                            } else if (value < 0) {
                                                direction = 'backward'
                                                speed = -value
                                            }

                                            setMotorASpeed(speed)
                                            setMotorADirection(direction)

                                            if (speed === 0) {
                                                sendCommand("set_speed", { motor: 'A', speed: 0 })
                                                return
                                            }

                                            setTimeout(() => {
                                                sendCommand("set_speed", { motor: 'A', speed })
                                                sendCommand(direction === 'forward'
                                                    ? 'motor_a_forward'
                                                    : 'motor_a_backward')
                                            }, 40)
                                        }}
                                        direction={motorADirection}
                                        speed={motorASpeed}
                                    />
                                </div>

                                <div className="w-[calc(50%-10px)] h-[50%] mt-[12%]">
                                    <Joystick
                                        motor="B"
                                        onChange={(value) => {
                                            let direction: 'forward' | 'backward' | 'stop' = 'stop'
                                            let speed = 0

                                            if (value > 0) {
                                                direction = 'forward'
                                                speed = value
                                            } else if (value < 0) {
                                                direction = 'backward'
                                                speed = -value
                                            }

                                            setMotorBSpeed(speed)
                                            setMotorBDirection(direction)

                                            if (speed === 0) {
                                                sendCommand("set_speed", { motor: 'B', speed: 0 })
                                                return
                                            }

                                            setTimeout(() => {
                                                sendCommand("set_speed", { motor: 'B', speed })
                                                sendCommand(direction === 'forward'
                                                    ? 'motor_b_forward'
                                                    : 'motor_b_backward')
                                            }, 40)
                                        }}
                                        direction={motorBDirection}
                                        speed={motorBSpeed}
                                    />
                                </div>
                            </div>

                            <div className="p-2 flex justify-center">
                                <Button
                                    onClick={emergencyStop}
                                    disabled={!isConnected || !isIdentified}
                                    size="sm"
                                    variant="destructive"
                                    className="h-8"
                                >
                                    E-Stop
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Логи */}
            <div className="flex flex-col">
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 self-start"
                    onClick={() => setLogVisible(!logVisible)}
                >
                    {logVisible ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                    <span className="ml-1">Logs</span>
                </Button>

                {logVisible && (
                    <div className={styles.logContainer}>
                        {log.slice().reverse().map((entry, index) => (
                            <div
                                key={index}
                                className={`${entry.type === 'client' ? 'text-blue-500' :
                                    entry.type === 'esp' ? 'text-green-500' :
                                        entry.type === 'server' ? 'text-purple-500' : 'text-red-500 font-bold'}`}
                            >
                                {entry.message}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}