"use client"
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

// Типы данных
type MessageType = {
    type?: string;
    command?: string;
    deviceId?: string;
    message?: string;
    params?: any;
    clientId?: number;
    status?: string;
    timestamp?: string;
    origin?: 'client' | 'esp' | 'server' | 'error';
    reason?: string;
};

type LogEntry = {
    message: string;
    type: 'client' | 'esp' | 'server' | 'error';
};

// Компонент джойстика
const Joystick = ({
                      motor,
                      value,
                      onChange,
                      direction,
                      speed
                  }: {
    motor: 'A' | 'B';
    value: number;
    onChange: (value: number) => void;
    direction: 'forward' | 'backward' | 'stop';
    speed: number;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sliderRef = useRef<HTMLInputElement>(null);
    const isDragging = useRef(false);
    const startY = useRef(0);

    // Стили для каждого мотора
    const motorStyles = {
        A: {
            container: {
                background: 'rgba(255, 87, 34, 0.2)',
                border: '2px solid #ff5722'
            },
            activeBg: 'rgba(255, 87, 34, 0.5)'
        },
        B: {
            container: {
                background: 'rgba(76, 175, 80, 0.2)',
                border: '2px solid #4caf50'
            },
            activeBg: 'rgba(76, 175, 80, 0.5)'
        }
    };

    useEffect(() => {
        const container = containerRef.current;
        const slider = sliderRef.current;
        if (!container || !slider) return;

        const updateSliderValue = (clientY: number) => {
            const rect = container.getBoundingClientRect();
            const y = clientY - rect.top;
            const height = rect.height;
            let value = ((height - y) / height) * 510 - 255;
            value = Math.max(-255, Math.min(255, value));

            slider.value = value.toString();
            onChange(value);

            // Изменение цвета при движении
            const intensity = Math.abs(value) / 255 * 0.3 + 0.2;
            container.style.backgroundColor = `rgba(${
                motor === 'A' ? '255, 87, 34' : '76, 175, 80'
            }, ${intensity})`;
        };

        const handleStart = (clientY: number) => {
            isDragging.current = true;
            startY.current = clientY;
            container.style.transition = 'none';
            updateSliderValue(clientY);
        };

        const handleMove = (clientY: number) => {
            if (!isDragging.current) return;
            updateSliderValue(clientY);
        };

        const handleEnd = () => {
            if (!isDragging.current) return;
            isDragging.current = false;
            container.style.transition = 'background-color 0.3s';
            container.style.backgroundColor = motorStyles[motor].container.background;
            onChange(0);
        };

        // Touch events
        const touchStartHandler = (e: TouchEvent) => {
            e.preventDefault();
            handleStart(e.touches[0].clientY);
        };

        const touchMoveHandler = (e: TouchEvent) => {
            if (!isDragging.current) return;
            e.preventDefault();
            handleMove(e.touches[0].clientY);
        };

        const touchEndHandler = () => {
            handleEnd();
        };

        // Добавляем только touch-обработчики
        container.addEventListener('touchstart', touchStartHandler, { passive: false });
        container.addEventListener('touchmove', touchMoveHandler, { passive: false });
        container.addEventListener('touchend', touchEndHandler, { passive: false });
        container.addEventListener('touchcancel', touchEndHandler, { passive: false });

        return () => {
            container.removeEventListener('touchstart', touchStartHandler);
            container.removeEventListener('touchmove', touchMoveHandler);
            container.removeEventListener('touchend', touchEndHandler);
            container.removeEventListener('touchcancel', touchEndHandler);
        };
    }, [motor, onChange]);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                width: '100%',
                height: '300px',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                overflow: 'hidden',
                ...motorStyles[motor].container
            }}
        >
            <input
                ref={sliderRef}
                type="range"
                min="-255"
                max="255"
                value={value}
                style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    WebkitAppearance: 'slider-vertical',
                    writingMode: 'bt-lr',
                    transform: 'rotate(0deg)',
                    opacity: '0',
                    cursor: 'pointer',
                    touchAction: 'none',
                    zIndex: '2',
                    pointerEvents: 'none'
                }}
                readOnly
            />
            <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '0',
                right: '0',
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#333',
                zIndex: '1',
                pointerEvents: 'none'
            }}>
                {direction !== 'stop' ? (
                    <span>{direction === 'forward' ? '↑' : '↓'} {speed}</span>
                ) : (
                    <span>Motor {motor}</span>
                )}
            </div>
        </div>
    );
};

// Основной компонент
export default function WebsocketController() {
    const [log, setLog] = useState<LogEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isIdentified, setIsIdentified] = useState(false);
    const [deviceId, setDeviceId] = useState('123');
    const [inputDeviceId, setInputDeviceId] = useState('123');
    const [espConnected, setEspConnected] = useState(false);
    const [controlVisible, setControlVisible] = useState(false);
    const [motorASpeed, setMotorASpeed] = useState(0);
    const [motorBSpeed, setMotorBSpeed] = useState(0);
    const [motorADirection, setMotorADirection] = useState<'forward' | 'backward' | 'stop'>('stop');
    const [motorBDirection, setMotorBDirection] = useState<'forward' | 'backward' | 'stop'>('stop');

    const socketRef = useRef<WebSocket | null>(null);
    const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const motorAChangeRef = useRef<NodeJS.Timeout | null>(null);
    const motorBChangeRef = useRef<NodeJS.Timeout | null>(null);

    const addLog = useCallback((msg: string, type: LogEntry['type']) => {
        setLog(prev => [...prev.slice(-100), {message: `${new Date().toLocaleTimeString()}: ${msg}`, type}]);
    }, []);

    const sendCommand = useCallback((command: string, params?: any) => {
        if (!isIdentified) {
            addLog("Cannot send command: not identified", 'error');
            return;
        }

        if (socketRef.current?.readyState === WebSocket.OPEN) {
            const msg = JSON.stringify({
                command,
                params,
                deviceId,
                timestamp: Date.now(),
                expectAck: true
            });

            socketRef.current.send(msg);
            addLog(`Sent command to ${deviceId}: ${command}`, 'client');

            if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
            commandTimeoutRef.current = setTimeout(() => {
                if (espConnected) {
                    addLog(`Command ${command} not acknowledged by ESP`, 'error');
                    setEspConnected(false);
                }
            }, 5000);
        } else {
            addLog("WebSocket not ready!", 'error');
        }
    }, [addLog, deviceId, isIdentified, espConnected]);

    const handleMotorAControl = useCallback((speed: number, direction: 'forward' | 'backward' | 'stop') => {
        setMotorASpeed(Math.abs(speed));
        setMotorADirection(direction);

        if (motorAChangeRef.current) {
            clearTimeout(motorAChangeRef.current);
        }

        motorAChangeRef.current = setTimeout(() => {
            if (direction === 'stop') {
                sendCommand("set_speed", { motor: 'A', speed: 0 });
            } else {
                sendCommand("set_speed", { motor: 'A', speed: Math.abs(speed) });
                if (direction === 'forward') {
                    sendCommand("motor_a_forward");
                } else {
                    sendCommand("motor_a_backward");
                }
            }
        }, 20);
    }, [sendCommand]);

    const handleMotorBControl = useCallback((speed: number, direction: 'forward' | 'backward' | 'stop') => {
        setMotorBSpeed(Math.abs(speed));
        setMotorBDirection(direction);

        if (motorBChangeRef.current) {
            clearTimeout(motorBChangeRef.current);
        }

        motorBChangeRef.current = setTimeout(() => {
            if (direction === 'stop') {
                sendCommand("set_speed", { motor: 'B', speed: 0 });
            } else {
                sendCommand("set_speed", { motor: 'B', speed: Math.abs(speed) });
                if (direction === 'forward') {
                    sendCommand("motor_b_forward");
                } else {
                    sendCommand("motor_b_backward");
                }
            }
        }, 20);
    }, [sendCommand]);

    const connectWebSocket = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close();
        }

        const ws = new WebSocket('wss://ardu.site/ws');

        ws.onopen = () => {
            setIsConnected(true);
            addLog("Connected to WebSocket server", 'server');

            ws.send(JSON.stringify({
                type: 'client_type',
                clientType: 'browser'
            }));

            ws.send(JSON.stringify({
                type: 'identify',
                deviceId: inputDeviceId
            }));
        };

        ws.onmessage = (event) => {
            try {
                const data: MessageType = JSON.parse(event.data);

                if (data.type === "system") {
                    if (data.status === "connected") {
                        setIsIdentified(true);
                        setDeviceId(inputDeviceId);
                    }
                    addLog(`System: ${data.message}`, 'server');
                }
                else if (data.type === "error") {
                    addLog(`Error: ${data.message}`, 'error');
                    setIsIdentified(false);
                }
                else if (data.type === "log") {
                    addLog(`ESP: ${data.message}`, 'esp');
                    if (data.message?.includes("Heartbeat")) {
                        setEspConnected(true);
                    }
                }
                else if (data.type === "esp_status") {
                    setEspConnected(data.status === "connected");
                    addLog(`ESP ${data.status === "connected" ? "✅ Connected" : "❌ Disconnected"}${data.reason ? ` (${data.reason})` : ''}`,
                        data.status === "connected" ? 'esp' : 'error');
                }
                else if (data.type === "command_ack") {
                    if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
                    addLog(`ESP executed command: ${data.command}`, 'esp');
                }
            } catch (error) {
                addLog(`Received invalid message: ${event.data}`, 'error');
            }
        };

        ws.onclose = (event) => {
            setIsConnected(false);
            setIsIdentified(false);
            setEspConnected(false);
            addLog(`Disconnected from server${event.reason ? `: ${event.reason}` : ''}`, 'server');
        };

        ws.onerror = (error) => {
            addLog(`WebSocket error: ${error.type}`, 'error');
        };

        socketRef.current = ws;
    }, [addLog, inputDeviceId]);

    const disconnectWebSocket = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
            setIsConnected(false);
            setIsIdentified(false);
            setEspConnected(false);
            addLog("Disconnected manually", 'server');
        }
    }, [addLog]);

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
            if (motorAChangeRef.current) clearTimeout(motorAChangeRef.current);
            if (motorBChangeRef.current) clearTimeout(motorBChangeRef.current);
        };
    }, []);

    useEffect(() => {
        const heartbeatInterval = setInterval(() => {
            if (isConnected && isIdentified) {
                sendCommand("heartbeat2");
            }
        }, 1000);

        return () => clearInterval(heartbeatInterval);
    }, [isConnected, isIdentified, sendCommand]);

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
                background: isConnected ?
                    (isIdentified ?
                        (espConnected ? '#e6f7e6' : '#fff3e0') :
                        '#fff3e0') :
                    '#ffebee',
                border: `1px solid ${isConnected ?
                    (isIdentified ?
                        (espConnected ? '#4caf50' : '#ffa000') :
                        '#ffa000') :
                    '#f44336'}`,
                borderRadius: '4px'
            }}>
                Status: {isConnected ?
                (isIdentified ? `✅ Connected & Identified (ESP: ${espConnected ? '✅' : '❌'})` : "🟡 Connected (Pending)") :
                "❌ Disconnected"}
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
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="Enter Device ID"
                        value={inputDeviceId}
                        onChange={(e) => setInputDeviceId(e.target.value)}
                        disabled={isConnected}
                        style={{
                            flexGrow: '1',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}
                    />
                    <button
                        onClick={connectWebSocket}
                        disabled={isConnected}
                        style={{
                            padding: '10px 15px',
                            background: '#2196f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
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
                            cursor: 'pointer'
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
                    margin: '0',
                    padding: '20px',
                    boxSizing: 'border-box',
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1000,
                    background: 'white',
                    overflow: 'auto',
                    touchAction: 'none'
                }}>
                    <DialogHeader>
                        <DialogTitle style={{
                            position: 'absolute',
                            width: '1px',
                            height: '1px',
                            padding: '0',
                            margin: '-1px',
                            overflow: 'hidden',
                            clip: 'rect(0, 0, 0, 0)',
                            whiteSpace: 'nowrap',
                            borderWidth: '0'
                        }}>
                            Motor Controls
                        </DialogTitle>
                    </DialogHeader>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: 'calc(100% - 60px)',
                        marginTop: '10px'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '20px',
                            height: '100%',
                            minHeight: '300px'
                        }}>
                            <div style={{
                                flex: '1',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                minWidth: '120px'
                            }}>
                                <Joystick
                                    motor="A"
                                    value={motorADirection === 'forward' ? motorASpeed : (motorADirection === 'backward' ? -motorASpeed : 0)}
                                    onChange={(value) => {
                                        if (value > 0) {
                                            handleMotorAControl(value, 'forward');
                                        } else if (value < 0) {
                                            handleMotorAControl(-value, 'backward');
                                        } else {
                                            handleMotorAControl(0, 'stop');
                                        }
                                    }}
                                    direction={motorADirection}
                                    speed={motorASpeed}
                                />
                            </div>

                            <div style={{
                                flex: '1',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                minWidth: '120px'
                            }}>
                                <Joystick
                                    motor="B"
                                    value={motorBDirection === 'forward' ? motorBSpeed : (motorBDirection === 'backward' ? -motorBSpeed : 0)}
                                    onChange={(value) => {
                                        if (value > 0) {
                                            handleMotorBControl(value, 'forward');
                                        } else if (value < 0) {
                                            handleMotorBControl(-value, 'backward');
                                        } else {
                                            handleMotorBControl(0, 'stop');
                                        }
                                    }}
                                    direction={motorBDirection}
                                    speed={motorBSpeed}
                                />
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <div style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                overflow: 'hidden'
            }}>
                <h3>Event Log</h3>
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
                            color: entry.type === 'client' ? '#2196F3' :
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
    );
}