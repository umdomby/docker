"use client"
import { useState, useEffect, useRef, useCallback } from 'react';

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

export default function WebsocketController() {
    const [log, setLog] = useState<LogEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isIdentified, setIsIdentified] = useState(false);
    const [deviceId, setDeviceId] = useState('123');
    const [inputDeviceId, setInputDeviceId] = useState('123');
    const [espConnected, setEspConnected] = useState(false);
    const [controlVisible, setControlVisible] = useState(true);
    const [motorASpeed, setMotorASpeed] = useState(0);
    const [motorBSpeed, setMotorBSpeed] = useState(0);
    const [motorADirection, setMotorADirection] = useState<'forward' | 'backward' | 'stop'>('stop');
    const [motorBDirection, setMotorBDirection] = useState<'forward' | 'backward' | 'stop'>('stop');
    const socketRef = useRef<WebSocket | null>(null);
    const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const espWatchdogRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptRef = useRef(0);
    const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const addLog = useCallback((msg: string, type: LogEntry['type']) => {
        setLog(prev => [...prev.slice(-100), {message: `${new Date().toLocaleTimeString()}: ${msg}`, type}]);
    }, []);

    // Функция debounce
    const useDebouncedCallback = <T extends (...args: any[]) => void>(
        callback: T,
        delay: number
    ) => {
        const timeoutRef = useRef<NodeJS.Timeout | null>(null);

        return useCallback((...args: Parameters<T>) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                callback(...args);
            }, delay);
        }, [callback, delay]);
    };

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

    const connectWebSocket = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close();
        }

        reconnectAttemptRef.current = 0;
        const ws = new WebSocket('wss://ardu.site/ws');

        ws.onopen = () => {
            setIsConnected(true);
            reconnectAttemptRef.current = 0;
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
                console.log("Received message:", data);

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
                    if (data.message && data.message.includes("Heartbeat")) {
                        setEspConnected(true);
                    }
                }
                else if (data.type === "esp_status") {
                    console.log(`Received ESP status: ${data.status}`);
                    setEspConnected(data.status === "connected");
                    addLog(`ESP ${data.status === "connected" ? "✅ Connected" : "❌ Disconnected"}${data.reason ? ` (${data.reason})` : ''}`,
                        data.status === "connected" ? 'esp' : 'error');
                }
                else if (data.type === "command_ack") {
                    if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
                    addLog(`ESP executed command: ${data.command}`, 'esp');
                }
                else if (data.type === "command_status") {
                    addLog(`Command ${data.command} delivered to ESP`, 'server');
                }
            } catch (error) {
                console.error("Error processing message:", error);
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
            reconnectAttemptRef.current = 5;
        }
    }, [addLog]);

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, []);

    // Дебаунс версии обработчиков моторов
    const debouncedMotorAControl = useDebouncedCallback(
        (speed: number, direction: 'forward' | 'backward' | 'stop') => {
            setMotorASpeed(Math.abs(speed));
            setMotorADirection(direction);

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
        },
        50 // Задержка 50мс
    );

    const debouncedMotorBControl = useDebouncedCallback(
        (speed: number, direction: 'forward' | 'backward' | 'stop') => {
            setMotorBSpeed(Math.abs(speed));
            setMotorBDirection(direction);

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
        },
        50 // Задержка 50мс
    );

    const handleControlVisibility = useCallback(() => {
        setControlVisible(prev => !prev);
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
        <div className="container">
            <h1>ESP8266 WebSocket Control</h1>

            <div className="status">
                Status: {isConnected ?
                (isIdentified ? `✅ Connected & Identified (ESP: ${espConnected ? '✅' : '❌'})` : "🟡 Connected (Pending)") :
                "❌ Disconnected"}
                {reconnectAttemptRef.current > 0 && reconnectAttemptRef.current < 5 &&
                    ` (Reconnecting ${reconnectAttemptRef.current}/5)`}
            </div>

            <div className="connection-control">
                <div className="device-id-input">
                    <input
                        type="text"
                        placeholder="Enter Device ID"
                        value={inputDeviceId}
                        onChange={(e) => setInputDeviceId(e.target.value)}
                        disabled={isConnected}
                    />
                </div>
                <div className="connection-buttons">
                    <button
                        onClick={connectWebSocket}
                        disabled={isConnected}
                    >
                        Connect
                    </button>
                    <button
                        onClick={disconnectWebSocket}
                        disabled={!isConnected}
                        className="disconnect-btn"
                    >
                        Disconnect
                    </button>
                </div>
            </div>

            <button onClick={handleControlVisibility}>
                {controlVisible ? "Hide Controls" : "Show Controls"}
            </button>

            {controlVisible && (
                <div className="control-panel">
                    <div className="device-info">
                        <p>Current Device ID: <strong>{deviceId}</strong></p>
                        <p>ESP Status: <strong>{espConnected ? 'Connected' : 'Disconnected'}</strong></p>
                    </div>

                    <div className="tank-controls">
                        <div className="motor-control motor-a">
                            <div className="joystick">
                                <input
                                    type="range"
                                    min="-255"
                                    max="255"
                                    value={motorADirection === 'forward' ? motorASpeed : (motorADirection === 'backward' ? -motorASpeed : 0)}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (value > 0) {
                                            debouncedMotorAControl(value, 'forward');
                                        } else if (value < 0) {
                                            debouncedMotorAControl(-value, 'backward');
                                        } else {
                                            debouncedMotorAControl(0, 'stop');
                                        }
                                    }}
                                    onMouseUp={() => {
                                        debouncedMotorAControl(0, 'stop');
                                    }}
                                    onTouchEnd={() => {
                                        debouncedMotorAControl(0, 'stop');
                                    }}
                                    className="vertical-slider"
                                />
                                <div className="motor-info">
                                    <span>Motor A: {motorASpeed}</span>
                                    <span>{motorADirection === 'forward' ? 'Forward' : motorADirection === 'backward' ? 'Backward' : 'Stopped'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="motor-control motor-b">
                            <div className="joystick">
                                <input
                                    type="range"
                                    min="-255"
                                    max="255"
                                    value={motorBDirection === 'forward' ? motorBSpeed : (motorBDirection === 'backward' ? -motorBSpeed : 0)}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (value > 0) {
                                            debouncedMotorBControl(value, 'forward');
                                        } else if (value < 0) {
                                            debouncedMotorBControl(-value, 'backward');
                                        } else {
                                            debouncedMotorBControl(0, 'stop');
                                        }
                                    }}
                                    onMouseUp={() => {
                                        debouncedMotorBControl(0, 'stop');
                                    }}
                                    onTouchEnd={() => {
                                        debouncedMotorBControl(0, 'stop');
                                    }}
                                    className="vertical-slider"
                                />
                                <div className="motor-info">
                                    <span>Motor B: {motorBSpeed}</span>
                                    <span>{motorBDirection === 'forward' ? 'Forward' : motorBDirection === 'backward' ? 'Backward' : 'Stopped'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="log-container">
                <h3>Event Log</h3>
                <div className="log-content">
                    {log.slice().reverse().map((entry, index) => (
                        <div key={index} className={`log-entry ${entry.type}`}>
                            {entry.message}
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    font-family: Arial;
                }

                .status {
                    margin: 10px 0;
                    padding: 10px;
                    background: ${isConnected ?
                (isIdentified ?
                    (espConnected ? '#e6f7e6' : '#fff3e0') :
                    '#fff3e0') :
                '#ffebee'};
                    border: 1px solid ${isConnected ?
                (isIdentified ?
                    (espConnected ? '#4caf50' : '#ffa000') :
                    '#ffa000') :
                '#f44336'};
                    border-radius: 4px;
                }

                .connection-control {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin: 15px 0;
                    padding: 15px;
                    background: #f5f5f5;
                    border-radius: 8px;
                }

                .device-id-input input {
                    flex-grow: 1;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }

                .connection-buttons {
                    display: flex;
                    gap: 10px;
                }

                button {
                    padding: 10px 15px;
                    background: #2196f3;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }

                button:disabled {
                    background: #b0bec5;
                    cursor: not-allowed;
                }

                .disconnect-btn {
                    background: #f44336;
                }

                .control-panel {
                    margin: 20px 0;
                    padding: 15px;
                    background: #f5f5f5;
                    border-radius: 8px;
                }

                .device-info {
                    padding: 10px;
                    background: white;
                    border-radius: 4px;
                    margin-bottom: 10px;
                }

                .tank-controls {
                    display: flex;
                    justify-content: space-between;
                    gap: 20px;
                    height: 50vh;
                }

                .motor-control {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                }

                .joystick {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 100%;
                    height: 100%;
                    background: rgba(33, 150, 243, 0.2);
                    border-radius: 8px;
                    padding: 20px;
                }

                .vertical-slider {
                    width: 80px;
                    height: 100%;
                    -webkit-appearance: slider-vertical;
                    writing-mode: bt-lr;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                }

                .vertical-slider:hover {
                    opacity: 1;
                }

                .motor-info {
                    margin-top: 10px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                }

                .log-container {
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    overflow: hidden;
                }

                .log-content {
                    height: 300px;
                    overflow-y: auto;
                    padding: 10px;
                    background: #fafafa;
                }

                .log-entry {
                    margin: 5px 0;
                    padding: 5px;
                    border-bottom: 1px solid #eee;
                    font-family: monospace;
                    font-size: 14px;
                }

                .log-entry.client {
                    color: #2196F3;
                }

                .log-entry.esp {
                    color: #4CAF50;
                }

                .log-entry.server {
                    color: #9C27B0;
                }

                .log-entry.error {
                    color: #F44336;
                    font-weight: bold;
                }

                @media (max-width: 768px) {
                    .tank-controls {
                        flex-direction: column;
                        height: 70vh;
                    }
                    
                    .motor-control {
                        height: 50%;
                    }
                    
                    .vertical-slider {
                        height: 80%;
                    }
                }
            `}</style>
        </div>
    );
}