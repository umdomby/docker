// components/control/SocketClient.tsx
"use client"
import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useMotorControlStore } from '@/stores/motorControlStore'
import {StatusConnected_ESP8266, useESP8266StatusStore} from '@/components/dataStores/statusConnected_ESP8266'
import Joystick from "@/components/control/Joystick";

export default function SocketClient() {
    const [log, setLog] = useState<{message: string, type: 'client' | 'esp' | 'server' | 'error'}[]>([])
    const [inputDeviceId, setInputDeviceId] = useState('')
    const [newDeviceId, setNewDeviceId] = useState('')
    const [deviceList, setDeviceList] = useState<string[]>([])
    const [controlVisible, setControlVisible] = useState(false)
    const [logVisible, setLogVisible] = useState(false)
    const [autoReconnect, setAutoReconnect] = useState(false)

    const {
        isConnected,
        isIdentified,
        espConnected,
        deviceId,
        autoConnect,
        setLeftMotorSpeed,
        setRightMotorSpeed,
        setConnectionStatus,
        setDeviceId,
        setAutoConnect,
        connectWebSocket,
        disconnectWebSocket
    } = useMotorControlStore()

    const {
        setIsConnected,
        setIsIdentified,
        setEspConnected
    } = useESP8266StatusStore()

    const currentDeviceIdRef = useRef(deviceId)

    useEffect(() => {
        currentDeviceIdRef.current = deviceId
    }, [deviceId])

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
    }, [setDeviceId])

    const saveNewDeviceId = useCallback(() => {
        if (newDeviceId && !deviceList.includes(newDeviceId)) {
            const updatedList = [...deviceList, newDeviceId]
            setDeviceList(updatedList)
            localStorage.setItem('espDeviceList', JSON.stringify(updatedList))
            setInputDeviceId(newDeviceId)
            setNewDeviceId('')
            setDeviceId(newDeviceId)
            currentDeviceIdRef.current = newDeviceId
        }
    }, [newDeviceId, deviceList, setDeviceId])

    const addLog = useCallback((msg: string, type: 'client' | 'esp' | 'server' | 'error') => {
        setLog(prev => [...prev.slice(-100), {message: `${new Date().toLocaleTimeString()}: ${msg}`, type}])
    }, [])

    const handleAutoConnectChange = useCallback((checked: boolean) => {
        setAutoConnect(checked)
        addLog(`Auto connect ${checked ? 'enabled' : 'disabled'}`, 'client')
    }, [setAutoConnect, addLog])

    const handleConnect = useCallback(() => {
        connectWebSocket(currentDeviceIdRef.current)
        addLog(`Connecting to device: ${currentDeviceIdRef.current}`, 'client')

        // Обновляем статус в глобальном хранилище
        setIsConnected(true)
        setDeviceId(currentDeviceIdRef.current)

        // Имитация процесса подключения
        setTimeout(() => {
            setIsIdentified(true)
            setConnectionStatus(true, true, false)
            addLog(`Identified with device: ${currentDeviceIdRef.current}`, 'server')

            setTimeout(() => {
                setEspConnected(true)
                setConnectionStatus(true, true, true)
                addLog(`ESP8266 connected`, 'esp')
            }, 1000)
        }, 500)
    }, [connectWebSocket, addLog, setIsConnected, setIsIdentified, setEspConnected, setDeviceId, setConnectionStatus])

    const handleDisconnect = useCallback(() => {
        disconnectWebSocket()
        addLog('Disconnected manually', 'server')

        // Обновляем статус в глобальном хранилище
        setIsConnected(false)
        setIsIdentified(false)
        setEspConnected(false)
    }, [disconnectWebSocket, addLog, setIsConnected, setIsIdentified, setEspConnected])

    const handleDeviceChange = useCallback(async (value: string) => {
        setInputDeviceId(value)
        setDeviceId(value)
        currentDeviceIdRef.current = value
        addLog(`Selected device: ${value}`, 'client')

        if (autoReconnect && isConnected) {
            await handleDisconnect()
            handleConnect()
        }
    }, [setDeviceId, autoReconnect, isConnected, handleDisconnect, handleConnect, addLog])

    const toggleAutoReconnect = useCallback((checked: boolean) => {
        setAutoReconnect(checked)
        localStorage.setItem('autoReconnect', checked.toString())
        addLog(`Auto reconnect ${checked ? 'enabled' : 'disabled'}`, 'client')
    }, [addLog])

    const createMotorHandler = useCallback((motor: 'left' | 'right') => {
        return (value: number) => {
            if (motor === 'left') {
                setLeftMotorSpeed(value)
            } else {
                setRightMotorSpeed(value)
            }
            addLog(`Motor ${motor} set to ${value}`, 'client')
        }
    }, [setLeftMotorSpeed, setRightMotorSpeed, addLog])

    const handleMotorAControl = createMotorHandler('left')
    const handleMotorBControl = createMotorHandler('right')

    return (
        <div className="flex flex-col items-center min-h-screen p-4 bg-transparent">
            <div className="w-full max-w-md space-y-4 bg-transparent rounded-lg p-6 border border-gray-200 backdrop-blur-sm">
                {/* Header and Status */}
                <div className="flex flex-col items-center space-y-2">
                    <h1 className="text-2xl font-bold text-gray-800">ESP8266 Control Panel</h1>
                    <StatusConnected_ESP8266 />
                </div>

                {/* Device Selection */}
                <div className="space-y-2">
                    <Label className="block text-sm font-medium text-gray-700">Device ID</Label>
                    <div className="flex space-x-2">
                        <select
                            value={inputDeviceId}
                            onChange={(e) => handleDeviceChange(e.target.value)}
                            disabled={isConnected && !autoReconnect}
                            className="flex-1 bg-transparent border rounded-md px-3 py-2 text-sm"
                        >
                            {deviceList.map(id => (
                                <option key={id} value={id}>{id}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* New Device Input */}
                <div className="space-y-2">
                    <Label className="block text-sm font-medium text-gray-700">Add New Device</Label>
                    <div className="flex space-x-2">
                        <Input
                            value={newDeviceId}
                            onChange={(e) => setNewDeviceId(e.target.value)}
                            placeholder="Enter new device ID"
                            className="flex-1 bg-transparent"
                        />
                        <Button
                            onClick={saveNewDeviceId}
                            disabled={!newDeviceId}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Add
                        </Button>
                    </div>
                </div>

                {/* Connection Controls */}
                <div className="flex space-x-2">
                    <Button
                        onClick={handleConnect}
                        disabled={isConnected}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                        Connect
                    </Button>
                    <Button
                        onClick={handleDisconnect}
                        disabled={!isConnected || autoConnect}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                        Disconnect
                    </Button>
                </div>

                {/* Options */}
                <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="auto-reconnect"
                            checked={autoReconnect}
                            onCheckedChange={toggleAutoReconnect}
                            className="border-gray-300 bg-transparent"
                        />
                        <Label htmlFor="auto-reconnect" className="text-sm font-medium text-gray-700">
                            Auto reconnect when changing device
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="auto-connect"
                            checked={autoConnect}
                            onCheckedChange={handleAutoConnectChange}
                            className="border-gray-300 bg-transparent"
                        />
                        <Label htmlFor="auto-connect" className="text-sm font-medium text-gray-700">
                            Auto connect on page load
                        </Label>
                    </div>
                </div>

                {/* Controls Button */}
                <Button
                    onClick={() => setControlVisible(!controlVisible)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                    {controlVisible ? "Hide Motor Controls" : "Show Motor Controls"}
                </Button>

                {/* Logs Toggle */}
                <Button
                    onClick={() => setLogVisible(!logVisible)}
                    variant="outline"
                    className="w-full border-gray-300 bg-transparent hover:bg-gray-100/50"
                >
                    {logVisible ? (
                        <ChevronUp className="h-4 w-4 mr-2"/>
                    ) : (
                        <ChevronDown className="h-4 w-4 mr-2"/>
                    )}
                    {logVisible ? "Hide Logs" : "Show Logs"}
                </Button>

                {/* Logs Display */}
                {logVisible && (
                    <div className="border border-gray-200 rounded-md overflow-hidden bg-transparent backdrop-blur-sm">
                        <div className="h-48 overflow-y-auto p-2 bg-transparent text-xs font-mono">
                            {log.length === 0 ? (
                                <div className="text-gray-500 italic">No logs yet</div>
                            ) : (
                                log.slice().reverse().map((entry, index) => (
                                    <div
                                        key={index}
                                        className={`truncate py-1 ${
                                            entry.type === 'client' ? 'text-blue-600' :
                                                entry.type === 'esp' ? 'text-green-600' :
                                                    entry.type === 'server' ? 'text-purple-600' :
                                                        'text-red-600 font-semibold'
                                        }`}
                                    >
                                        {entry.message}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Motor Controls */}
            {controlVisible && (
                <div className="mt-4 p-4 bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col items-center">
                            <h3 className="font-medium mb-2">Left Motor</h3>
                            <Joystick
                                motor="left"
                                onChange={handleMotorAControl}

                            />
                        </div>
                        <div className="flex flex-col items-center">
                            <h3 className="font-medium mb-2">Right Motor</h3>
                            <Joystick
                                motor="right"
                                onChange={handleMotorBControl}

                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}