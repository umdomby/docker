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

const useJoystick = (
    onChange: (value: number) => void
) => {
    const joystickRef = useRef<HTMLDivElement>(null);
    const sliderRef = useRef<HTMLInputElement>(null);
    const isDragging = useRef(false);

    useEffect(() => {
        const joystick = joystickRef.current;
        const slider = sliderRef.current;
        if (!joystick || !slider) return;

        const updateSliderValue = (clientY: number) => {
            const rect = joystick.getBoundingClientRect();
            const y = clientY - rect.top;
            const height = rect.height;
            let value = ((height - y) / height) * 510 - 255;
            value = Math.max(-255, Math.min(255, value));

            slider.value = value.toString();
            onChange(value);

            joystick.style.backgroundColor = `rgba(33, 150, 243, ${Math.abs(value) / 255 * 0.5 + 0.2})`;
        };

        const handleStart = (clientY: number) => {
            isDragging.current = true;
            joystick.style.transition = 'none';
            updateSliderValue(clientY);
        };

        const handleMove = (clientY: number) => {
            if (!isDragging.current) return;
            updateSliderValue(clientY);
        };

        const handleEnd = () => {
            if (!isDragging.current) return;
            isDragging.current = false;
            joystick.style.transition = 'background-color 0.2s';
            joystick.style.backgroundColor = 'rgba(33, 150, 243, 0.2)';
            onChange(0);
        };

        // Mouse events
        const mouseDownHandler = (e: MouseEvent) => {
            e.preventDefault();
            handleStart(e.clientY);
        };

        const mouseMoveHandler = (e: MouseEvent) => {
            if (!isDragging.current) return;
            e.preventDefault();
            handleMove(e.clientY);
        };

        const mouseUpHandler = () => {
            handleEnd();
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

        joystick.addEventListener('mousedown', mouseDownHandler);
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);

        joystick.addEventListener('touchstart', touchStartHandler, { passive: false });
        document.addEventListener('touchmove', touchMoveHandler, { passive: false });
        document.addEventListener('touchend', touchEndHandler, { passive: false });

        return () => {
            joystick.removeEventListener('mousedown', mouseDownHandler);
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);

            joystick.removeEventListener('touchstart', touchStartHandler);
            document.removeEventListener('touchmove', touchMoveHandler);
            document.removeEventListener('touchend', touchEndHandler);
        };
    }, [onChange]);

    return { joystickRef, sliderRef };
};

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
    const espWatchdogRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptRef = useRef(0);
    const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const motorAChangeRef = useRef<NodeJS.Timeout | null>(null);
    const motorBChangeRef = useRef<NodeJS.Timeout | null>(null);
    const isTouchDeviceRef = useRef(false);

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

    const {
        joystickRef: joystickARef,
        sliderRef: sliderARef
    } = useJoystick((value) => {
        if (value > 0) {
            handleMotorAControl(value, 'forward');
        } else if (value < 0) {
            handleMotorAControl(-value, 'backward');
        } else {
            handleMotorAControl(0, 'stop');
        }
    });

    const {
        joystickRef: joystickBRef,
        sliderRef: sliderBRef
    } = useJoystick((value) => {
        if (value > 0) {
            handleMotorBControl(value, 'forward');
        } else if (value < 0) {
            handleMotorBControl(-value, 'backward');
        } else {
            handleMotorBControl(0, 'stop');
        }
    });

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
        // Detect touch device
        isTouchDeviceRef.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

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

            <Dialog open={controlVisible} onOpenChange={setControlVisible}>
                <DialogTrigger asChild>
                    <Button onClick={() => setControlVisible(!controlVisible)}>
                        {controlVisible ? "Hide Controls" : "Show Controls"}
                    </Button>
                </DialogTrigger>
                <DialogContent className="dialog-content" style={{zIndex: 1000}}>
                    <DialogHeader>
                        <DialogTitle className="sr-only">Motor Controls</DialogTitle>
                    </DialogHeader>

                    <div className="control-panel">
                        <div className="tank-controls">
                            <div className="motor-control motor-a">
                                <div className="joystick-container" ref={joystickARef}>
                                    <input
                                        ref={sliderARef}
                                        type="range"
                                        min="-255"
                                        max="255"
                                        value={motorADirection === 'forward' ? motorASpeed : (motorADirection === 'backward' ? -motorASpeed : 0)}
                                        className="vertical-slider"
                                    />
                                    <div className="joystick-indicator">
                                        {motorADirection !== 'stop' ? (
                                            <span>{motorADirection === 'forward' ? '↑' : '↓'} {motorASpeed}</span>
                                        ) : (
                                            <span>Motor A</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="motor-control motor-b">
                                <div className="joystick-container" ref={joystickBRef}>
                                    <input
                                        ref={sliderBRef}
                                        type="range"
                                        min="-255"
                                        max="255"
                                        value={motorBDirection === 'forward' ? motorBSpeed : (motorBDirection === 'backward' ? -motorBSpeed : 0)}
                                        className="vertical-slider"
                                    />
                                    <div className="joystick-indicator">
                                        {motorBDirection !== 'stop' ? (
                                            <span>{motorBDirection === 'forward' ? '↑' : '↓'} {motorBSpeed}</span>
                                        ) : (
                                            <span>Motor B</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

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

            <style jsx global>{`
        body {
          touch-action: manipulation;
          overflow-x: hidden;
        }
        
        @media (orientation: landscape) {
          body {
            touch-action: none;
            overflow: hidden;
            position: fixed;
            width: 100%;
          }
        }
      `}</style>

            <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
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

        :global(.dialog-content) {
          width: 100% !important;
          max-width: 100% !important;
          height: 80vh;
          max-height: 80vh !important;
          margin: 0 !important;
          padding: 20px;
          box-sizing: border-box;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1000;
          background: white;
          overflow: auto;
          touch-action: none;
          -webkit-overflow-scrolling: touch;
        }

        :global(.dialog-overlay) {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 999;
        }

        .control-panel {
          display: flex;
          flex-direction: column;
          height: calc(100% - 60px);
          margin-top: 10px;
        }

        .tank-controls {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          height: 100%;
          min-height: 300px;
        }

        .motor-control {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 120px;
        }

        .joystick-container {
          position: relative;
          width: 100%;
          height: 300px;
          background: rgba(33, 150, 243, 0.2);
          border-radius: 8px;
          display: flex;
          justify-content: center;
          align-items: center;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
          overflow: hidden;
        }

        .joystick-indicator {
          position: absolute;
          bottom: 10px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 14px;
          font-weight: bold;
          color: #333;
          z-index: 1;
          pointer-events: none;
        }

        .vertical-slider {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-appearance: slider-vertical;
          writing-mode: bt-lr;
          transform: rotate(0deg);
          opacity: 0.7;
          transition: opacity 0.2s;
          cursor: pointer;
          touch-action: none;
          z-index: 2;
          pointer-events: none;
        }

        .motor-a .joystick-container {
          border: 2px solid #ff5722;
        }

        .motor-b .joystick-container {
          border: 2px solid #4caf50;
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
          :global(.dialog-content) {
            height: 70vh;
            padding: 15px;
          }
          
          .tank-controls {
            flex-direction: row;
            height: 300px;
          }
          
          .joystick-container {
            height: 200px;
          }
        }

        @media (max-width: 480px) {
          :global(.dialog-content) {
            height: 60vh;
            padding: 10px;
          }
          
          .tank-controls {
            gap: 10px;
          }
          
          .motor-control {
            min-width: 100px;
          }
          
          .joystick-container {
            height: 150px;
          }
        }

        @media (hover: none) and (pointer: coarse) {
          .joystick-container {
            touch-action: none;
          }
          
          .vertical-slider {
            opacity: 1;
          }
        }

        @media (orientation: landscape) {
          :global(.dialog-content) {
            touch-action: none;
          }
          
          .joystick-container {
            touch-action: none;
          }
        }
      `}</style>
        </div>
    );
}