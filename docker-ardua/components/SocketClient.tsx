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
    const [deviceId, setDeviceId] = useState('1235'); // Установите правильный ID устройства
    const socketRef = useRef<WebSocket | null>(null);

    const addLog = useCallback((msg: string) => {
        setLog(prev => [...prev.slice(-100), `${new Date().toLocaleTimeString()}: ${msg}`]);
    }, []);

    const connectWebSocket = useCallback(() => {
        const ws = new WebSocket('ws://192.168.0.151:8080');

        ws.onopen = () => {
            setIsConnected(true);
            addLog("Connected to server");

            // Отправка идентификации сразу после подключения
            ws.send(JSON.stringify({
                type: 'identify',
                deviceId
            }));
        };

        ws.onmessage = (event) => {
            try {
                const data: MessageType = JSON.parse(event.data);

                if (data.type === "system") {
                    if (data.status === "connected") {
                        setIsIdentified(true);
                    }
                    addLog(`System: ${data.message}`);
                }
                else if (data.type === "error") {
                    addLog(`Error: ${data.message}`);
                }
            } catch {
                addLog(`Raw data: ${event.data}`);
            }
        };

        ws.onclose = () => {
            setIsConnected(false);
            setIsIdentified(false);
            addLog("Disconnected from server");
            setTimeout(connectWebSocket, 1000);
        };

        ws.onerror = (error) => {
            addLog(`WebSocket error: ${error.type}`);
        };

        socketRef.current = ws;
    }, [addLog, deviceId]);

    useEffect(() => {
        connectWebSocket();
        return () => {
            socketRef.current?.close();
        };
    }, [connectWebSocket]);

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

            <div className="control-panel">
                <div className="device-info">
                    <p>Device ID: <strong>{deviceId}</strong></p>
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