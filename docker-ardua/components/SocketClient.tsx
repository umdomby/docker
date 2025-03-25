"use client"
import { useState, useEffect, useRef, useCallback } from 'react';

type MessageType = {
    type?: string;
    command?: string;
    device?: string;
    action?: string;
    message?: string;
    params?: any;
    id?: string | number;
};

export default function WebsocketController() {
    const [log, setLog] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [angle, setAngle] = useState(90);
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectAttempt = useRef(0);

    const addLog = useCallback((msg: string) => {
        setLog(prev => [...prev.slice(-100), `${new Date().toLocaleTimeString()}: ${msg}`]);
    }, []);

    const connectWebSocket = useCallback(() => {
        const ws = new WebSocket('ws://192.168.0.151:8080');

        ws.onopen = () => {
            reconnectAttempt.current = 0;
            setIsConnected(true);
            addLog("Connected to server");
        };

        ws.onmessage = (event) => {
            try {
                const data: MessageType = JSON.parse(event.data);

                if (data.type === "system") {
                    addLog(`System: ${data.message} (ID: ${data.id})`);
                }
                else if (data.device === "esp8266") {
                    addLog(`ESP: ${data.action} - ${data.message}`);
                }
                else if (data.type === "pong") {
                    addLog(`Pong received (latency: ${Date.now() - (data.timestamp || 0)}ms)`);
                }
                else {
                    addLog(`Message: ${event.data}`);
                }
            } catch {
                addLog(`Raw data: ${event.data}`);
            }
        };

        ws.onclose = () => {
            setIsConnected(false);
            addLog("Disconnected from server");

            // Автопереподключение с экспоненциальной задержкой
            const delay = Math.min(5000, 1000 * Math.pow(2, reconnectAttempt.current));
            reconnectAttempt.current += 1;
            setTimeout(connectWebSocket, delay);
        };

        ws.onerror = (error) => {
            addLog(`Error: ${error.type}`);
        };

        socketRef.current = ws;
    }, [addLog]);

    useEffect(() => {
        connectWebSocket();
        return () => {
            socketRef.current?.close();
        };
    }, [connectWebSocket]);

    const sendCommand = useCallback((command: string, params?: any) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            try {
                const msg = JSON.stringify({
                    command,
                    params,
                    timestamp: Date.now()
                });
                socketRef.current.send(msg);
                addLog(`Sent: ${msg}`);
            } catch (err) {
                addLog(`Send error: ${err instanceof Error ? err.message : String(err)}`);
            }
        } else {
            addLog("WebSocket not ready!");
        }
    }, [addLog]);

    return (
        <div className="container">
            <h1>ESP8266 WebSocket Control</h1>

            <div className="status">
                Connection: {isConnected ? "✅ Connected" : "❌ Disconnected"}
                {reconnectAttempt.current > 0 && ` (Reconnecting ${reconnectAttempt.current})`}
            </div>

            <div className="control-panel">
                <button onClick={() => sendCommand("forward")}>Forward</button>
                <button onClick={() => sendCommand("backward")}>Backward</button>

                <div className="servo-control">
                    <input
                        type="range"
                        min="0"
                        max="180"
                        value={angle}
                        onChange={(e) => setAngle(parseInt(e.target.value))}
                    />
                    <span>{angle}°</span>
                    <button onClick={() => sendCommand("servo", {angle})}>
                        Set Angle
                    </button>
                </div>

                <button onClick={() => sendCommand("ping")} className="ping-btn">
                    Ping Server
                </button>
            </div>

            <div className="log-container">
                <h3>Event Log (last 100)</h3>
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
                    padding: 8px;
                    background: ${isConnected ? '#e6f7e6' : '#ffebee'};
                    border: 1px solid ${isConnected ? '#4caf50' : '#f44336'};
                    border-radius: 4px;
                }

                .control-panel {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin: 20px 0;
                    padding: 15px;
                    background: #f5f5f5;
                    border-radius: 8px;
                }

                button {
                    padding: 10px 15px;
                    cursor: pointer;
                    background: #2196f3;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    transition: background 0.3s;
                }

                button:hover {
                    background: #0b7dda;
                }

                .ping-btn {
                    background: #ff9800;
                }

                .ping-btn:hover {
                    background: #e68a00;
                }

                .servo-control {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 10px;
                    background: white;
                    border-radius: 6px;
                }

                input[type="range"] {
                    flex-grow: 1;
                }

                .log-container {
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    overflow: hidden;
                }

                .log-content {
                    height: 300px;
                    overflow-y: auto;
                    font-family: monospace;
                    font-size: 14px;
                    background: #fafafa;
                    padding: 10px;
                }

                .log-entry {
                    margin: 4px 0;
                    padding: 4px;
                    border-bottom: 1px solid #eee;
                    word-break: break-all;
                }
            `}</style>
        </div>
    );
}