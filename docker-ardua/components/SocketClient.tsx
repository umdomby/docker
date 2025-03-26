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
    const [angle, setAngle] = useState(90);
    const [deviceId, setDeviceId] = useState('123');
    const [inputDeviceId, setInputDeviceId] = useState('123');
    const [espConnected, setEspConnected] = useState(false);
    const socketRef = useRef<WebSocket | null>(null);
    const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const espWatchdogRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptRef = useRef(0);

    const addLog = useCallback((msg: string, type: LogEntry['type']) => {
        setLog(prev => [...prev.slice(-100), {message: `${new Date().toLocaleTimeString()}: ${msg}`, type}]);
    }, []);

    const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const resetHeartbeatTimeout = useCallback(() => {
        if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = setTimeout(() => {
            setEspConnected(false);
            addLog(`ESP[${deviceId}] connection lost (no heartbeat)`, 'error');
        }, 3000); // 3 секунды без Heartbeat = потеря связи
    }, [deviceId, addLog]);

    const resetEspWatchdog = useCallback(() => {
        if (espWatchdogRef.current) clearTimeout(espWatchdogRef.current);
        espWatchdogRef.current = setTimeout(() => {
            if (espConnected) {
                setEspConnected(false);
                addLog(`ESP[${deviceId}] connection lost (timeout)`, 'error');
            }
        }, 15000); // 15 секунд без ответа = потеря связи
    }, [deviceId, addLog, espConnected]);

    const connectWebSocket = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close();
        }

        reconnectAttemptRef.current = 0; // Сброс попыток переподключения
        const ws = new WebSocket('wss://ardu.site:444/');

        ws.onopen = () => {
            setIsConnected(true);
            reconnectAttemptRef.current = 0;
            addLog("Connected to WebSocket server", 'server');

            // Отправляем тип клиента
            ws.send(JSON.stringify({
                type: 'client_type',
                clientType: 'browser'
            }));

            // Идентификация
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
                        resetEspWatchdog();
                    }
                    addLog(`System: ${data.message}`, 'server');
                }
                else if (data.type === "error") {
                    addLog(`Error: ${data.message}`, 'error');
                    setIsIdentified(false);
                }
                else if (data.type === "log") {
                    addLog(`ESP: ${data.message}`, 'esp');
                    resetEspWatchdog();
                    if (data.message && data.message.includes("Heartbeat")) {
                        setEspConnected(true);
                        resetHeartbeatTimeout();
                    }
                }
                else if (data.type === "esp_status") {
                    console.log(`Received ESP status: ${data.status}`);
                    setEspConnected(data.status === "connected");
                    addLog(`ESP ${data.status === "connected" ? "✅ Connected" : "❌ Disconnected"}${data.reason ? ` (${data.reason})` : ''}`,
                        data.status === "connected" ? 'esp' : 'error');
                    if (data.status === "connected") resetEspWatchdog();
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
            if (espWatchdogRef.current) clearTimeout(espWatchdogRef.current);

            // Удаляем логику автоматического переподключения
            // if (reconnectAttemptRef.current < 5) {
            //     reconnectAttemptRef.current += 1;
            //     const delay = Math.min(1000 * reconnectAttemptRef.current, 5000);
            //     addLog(`Attempting to reconnect in ${delay/1000} seconds...`, 'server');
            //     setTimeout(connectWebSocket, delay);
            // }
        };

        ws.onerror = (error) => {
            addLog(`WebSocket error: ${error.type}`, 'error');
        };

        socketRef.current = ws;
    }, [addLog, inputDeviceId, resetEspWatchdog]);

    const disconnectWebSocket = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
            setIsConnected(false);
            setIsIdentified(false);
            setEspConnected(false);
            addLog("Disconnected manually", 'server');
            if (espWatchdogRef.current) clearTimeout(espWatchdogRef.current);
            if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
            reconnectAttemptRef.current = 5; // Отключаем автореконнект
        }
    }, [addLog]);

    useEffect(() => {
        // Удаляем автоподключение
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
            if (espWatchdogRef.current) clearTimeout(espWatchdogRef.current);
            if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
        };
    }, []);

    // useEffect(() => {
    //     // Автоподключение при монтировании
    //     connectWebSocket();
    //
    //     return () => {
    //         if (socketRef.current) {
    //             socketRef.current.close();
    //         }
    //         if (espWatchdogRef.current) clearTimeout(espWatchdogRef.current);
    //         if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    //     };
    // }, [connectWebSocket]);

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

            // Таймаут на подтверждение команды
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

            <div className="control-panel">
                <div className="device-info">
                    <p>Current Device ID: <strong>{deviceId}</strong></p>
                    <p>ESP Status: <strong>{espConnected ? 'Connected' : 'Disconnected'}</strong></p>
                </div>

                <button onClick={() => sendCommand("forward")} disabled={!isIdentified || !espConnected}>
                    Forward
                </button>
                <button onClick={() => sendCommand("backward")} disabled={!isIdentified || !espConnected}>
                    Backward
                </button>

                <div className="servo-control">
                    <input
                        type="range"
                        min="0"
                        max="180"
                        value={angle}
                        onChange={(e) => setAngle(parseInt(e.target.value))}
                        disabled={!isIdentified || !espConnected}
                    />
                    <span>{angle}°</span>
                    <button
                        onClick={() => sendCommand("servo", {angle})}
                        disabled={!isIdentified || !espConnected}
                    >
                        Set Angle
                    </button>
                </div>
            </div>

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

                .servo-control {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-top: 10px;
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
            `}</style>
        </div>
    );
}