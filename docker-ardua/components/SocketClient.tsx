"use client"
import { useState, useEffect, useRef, useCallback } from 'react';

type MessageType = {
    type?: string;
    command?: string;
    deviceId?: string;
    action?: string;
    message?: string;
    params?: any;
    clientId?: number;
    status?: string;
};

export default function WebsocketController() {
    const [log, setLog] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isIdentified, setIsIdentified] = useState(false);
    const [angle, setAngle] = useState(90);
    const [deviceId, setDeviceId] = useState('123');
    const [inputDeviceId, setInputDeviceId] = useState('123');
    const socketRef = useRef<WebSocket | null>(null);

    const addLog = useCallback((msg: string) => {
        setLog(prev => [...prev.slice(-100), `${new Date().toLocaleTimeString()}: ${msg}`]);
    }, []);

    const connectWebSocket = useCallback(() => {
        // Закрываем предыдущее соединение если оно есть
        if (socketRef.current) {
            socketRef.current.close();
        }

        const ws = new WebSocket('ws://192.168.0.151:8080');

        ws.onopen = () => {
            setIsConnected(true);
            addLog("Connected to server");

            // Отправка идентификации с новым deviceId
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
                        setDeviceId(inputDeviceId); // Устанавливаем новый deviceId после успешной идентификации
                    }
                    addLog(`System: ${data.message}`);
                }
                else if (data.type === "error") {
                    addLog(`Error: ${data.message}`);
                    setIsIdentified(false);
                }
            } catch {
                addLog(`Raw data: ${event.data}`);
            }
        };

        ws.onclose = () => {
            setIsConnected(false);
            setIsIdentified(false);
            addLog("Disconnected from server");
        };

        ws.onerror = (error) => {
            addLog(`WebSocket error: ${error.type}`);
        };

        socketRef.current = ws;
    }, [addLog, inputDeviceId]);

    const disconnectWebSocket = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close();
            setIsConnected(false);
            setIsIdentified(false);
            addLog("Disconnected manually");
        }
    }, [addLog]);

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, []);

    const sendCommand = useCallback((command: string, params?: any) => {
        if (!isIdentified) {
            addLog("Cannot send command: not identified");
            return;
        }

        if (socketRef.current?.readyState === WebSocket.OPEN) {
            const msg = JSON.stringify({
                command,
                params,
                deviceId,
                timestamp: Date.now()
            });
            socketRef.current.send(msg);
            addLog(`Sent command to ${deviceId}: ${command}`);
        } else {
            addLog("WebSocket not ready!");
        }
    }, [addLog, deviceId, isIdentified]);

    return (
        <div className="container">
            <h1>ESP8266 WebSocket Control</h1>

            <div className="status">
                Status: {isConnected ?
                (isIdentified ? "✅ Connected & Identified" : "🟡 Connected (Pending)") :
                "❌ Disconnected"}
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
                </div>

                <button onClick={() => sendCommand("forward")} disabled={!isIdentified}>
                    Forward
                </button>
                <button onClick={() => sendCommand("backward")} disabled={!isIdentified}>
                    Backward
                </button>

                <div className="servo-control">
                    <input
                        type="range"
                        min="0"
                        max="180"
                        value={angle}
                        onChange={(e) => setAngle(parseInt(e.target.value))}
                        disabled={!isIdentified}
                    />
                    <span>{angle}°</span>
                    <button
                        onClick={() => sendCommand("servo", { angle })}
                        disabled={!isIdentified}
                    >
                        Set Angle
                    </button>
                </div>
            </div>

            <div className="log-container">
                <h3>Event Log</h3>
                <div className="log-content">
                    {log.slice().reverse().map((entry, index) => (
                        <div key={index} className="log-entry">
                            {entry}
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
                (isIdentified ? '#e6f7e6' : '#fff3e0') :
                '#ffebee'};
                    border: 1px solid ${isConnected ?
                (isIdentified ? '#4caf50' : '#ffa000') :
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
                .device-id-input {
                    display: flex;
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
                .disconnect-btn:not(:disabled):hover {
                    background: #d32f2f;
                }
                .control-panel {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin: 20px 0;
                    padding: 15px;
                    background: #f5f5f5;
                    border-radius: 8px;
                }
                .device-info {
                    padding: 10px;
                    background: white;
                    border-radius: 4px;
                }
                .servo-control {
                    display: flex;
                    align-items: center;
                    gap: 10px;
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
                }
            `}</style>
        </div>
    );
}