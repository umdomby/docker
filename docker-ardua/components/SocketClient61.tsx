// "use client"
// import { useState, useEffect, useRef, useCallback } from 'react';
//
// type MessageType = {
//     type?: string;
//     command?: string;
//     deviceId?: string;
//     message?: string;
//     params?: any;
//     clientId?: number;
//     status?: string;
//     timestamp?: string;
//     origin?: 'client' | 'esp' | 'server' | 'error';
//     reason?: string;
// };
//
// type LogEntry = {
//     message: string;
//     type: 'client' | 'esp' | 'server' | 'error';
// };
//
// export default function WebsocketController() {
//     const [log, setLog] = useState<LogEntry[]>([]);
//     const [isConnected, setIsConnected] = useState(false);
//     const [isIdentified, setIsIdentified] = useState(false);
//     const [deviceId, setDeviceId] = useState('123');
//     const [inputDeviceId, setInputDeviceId] = useState('123');
//     const [espConnected, setEspConnected] = useState(false);
//     const [controlVisible, setControlVisible] = useState(true);
//
//     const socketRef = useRef<WebSocket | null>(null);
//     const motorARef = useRef<HTMLInputElement>(null);
//     const motorBRef = useRef<HTMLInputElement>(null);
//     const lastEspPingRef = useRef<number>(0);
//     const espCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
//     const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
//
//     const addLog = useCallback((msg: string, type: LogEntry['type']) => {
//         setLog(prev => [...prev.slice(-100), {message: `${new Date().toLocaleTimeString()}: ${msg}`, type}]);
//     }, []);
//
//     const checkEspConnection = useCallback(() => {
//         const now = Date.now();
//         // Если от ESP не было сообщений более 15 секунд - считаем что соединение разорвано
//         if (now - lastEspPingRef.current > 15000) {
//             setEspConnected(false);
//             addLog("ESP connection lost - no recent pings", 'error');
//         }
//     }, [addLog]);
//
//     const processMessage = useCallback((data: MessageType) => {
//         // Обновляем время последнего сообщения от ESP
//         if (data.origin === 'esp') {
//             lastEspPingRef.current = Date.now();
//             if (!espConnected) {
//                 setEspConnected(true);
//                 addLog("ESP ✅ Connected", 'esp');
//             }
//         }
//
//         if (data.type === "system" && data.status === "connected") {
//             setIsIdentified(true);
//             setDeviceId(inputDeviceId);
//         }
//
//         if (data.type === "esp_status") {
//             setEspConnected(data.status === "connected");
//         }
//
//         if (data.message) {
//             addLog(`${data.origin || data.type}: ${data.message}`,
//                 data.type === "error" ? 'error' : data.origin as LogEntry['type'] || 'server');
//         }
//
//         // Специальная обработка heartbeat
//         if (data.command === "heartbeat" || data.command === "heartbeat2") {
//             lastEspPingRef.current = Date.now();
//             if (!espConnected) {
//                 setEspConnected(true);
//                 addLog("ESP ✅ Connected (via heartbeat)", 'esp');
//             }
//         }
//     }, [addLog, espConnected, inputDeviceId]);
//
//     const sendCommand = useCallback((command: string, params?: any) => {
//         if (!isIdentified || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
//             return;
//         }
//
//         const msg = JSON.stringify({
//             command,
//             params,
//             deviceId,
//             timestamp: Date.now()
//         });
//
//         socketRef.current.send(msg);
//         addLog(`Sent: ${command}`, 'client');
//     }, [addLog, deviceId, isIdentified]);
//
//     const connectWebSocket = useCallback(() => {
//         if (socketRef.current) {
//             socketRef.current.close();
//         }
//
//         const ws = new WebSocket('wss://ardu.site/ws');
//
//         ws.onopen = () => {
//             setIsConnected(true);
//             addLog("Connected to server", 'server');
//
//             ws.send(JSON.stringify({
//                 type: 'client_type',
//                 clientType: 'browser'
//             }));
//
//             ws.send(JSON.stringify({
//                 type: 'identify',
//                 deviceId: inputDeviceId
//             }));
//
//             // Запускаем heartbeat каждые 10 секунд
//             heartbeatIntervalRef.current = setInterval(() => {
//                 sendCommand("heartbeat");
//                 sendCommand("heartbeat2");
//             }, 10000);
//
//             // Запускаем проверку соединения с ESP каждую секунду
//             espCheckIntervalRef.current = setInterval(checkEspConnection, 1000);
//         };
//
//         ws.onmessage = (event) => {
//             try {
//                 const data: MessageType = JSON.parse(event.data);
//                 processMessage(data);
//             } catch (error) {
//                 addLog(`Invalid message: ${event.data}`, 'error');
//             }
//         };
//
//         ws.onclose = () => {
//             setIsConnected(false);
//             setIsIdentified(false);
//             setEspConnected(false);
//             if (heartbeatIntervalRef.current) {
//                 clearInterval(heartbeatIntervalRef.current);
//             }
//             if (espCheckIntervalRef.current) {
//                 clearInterval(espCheckIntervalRef.current);
//             }
//             addLog("Disconnected from server", 'server');
//         };
//
//         ws.onerror = (error) => {
//             addLog(`WebSocket error: ${error.type}`, 'error');
//         };
//
//         socketRef.current = ws;
//     }, [addLog, checkEspConnection, inputDeviceId, processMessage, sendCommand]);
//
//     const disconnectWebSocket = useCallback(() => {
//         if (socketRef.current) {
//             socketRef.current.close();
//         }
//     }, []);
//
//     useEffect(() => {
//         return () => {
//             disconnectWebSocket();
//             if (heartbeatIntervalRef.current) {
//                 clearInterval(heartbeatIntervalRef.current);
//             }
//             if (espCheckIntervalRef.current) {
//                 clearInterval(espCheckIntervalRef.current);
//             }
//         };
//     }, [disconnectWebSocket]);
//
//     const controlMotor = useCallback((motor: 'A' | 'B', value: number) => {
//         const direction = value > 0 ? 'forward' : value < 0 ? 'backward' : 'stop';
//         const speed = Math.abs(value);
//
//         // Обновляем UI ползунка
//         const slider = motor === 'A' ? motorARef.current : motorBRef.current;
//         if (slider) slider.value = value.toString();
//
//         // Отправляем команды
//         if (direction === 'stop') {
//             sendCommand("set_speed", { motor, speed: 0 });
//         } else {
//             sendCommand("set_speed", { motor, speed });
//             sendCommand(`motor_${motor.toLowerCase()}_${direction}`);
//         }
//     }, [sendCommand]);
//
//     const handleSliderChange = (motor: 'A' | 'B') => (e: React.ChangeEvent<HTMLInputElement>) => {
//         controlMotor(motor, parseInt(e.target.value));
//     };
//
//     const handleSliderRelease = (motor: 'A' | 'B') => {
//         const slider = motor === 'A' ? motorARef.current : motorBRef.current;
//         if (slider) slider.value = '0';
//         controlMotor(motor, 0);
//     };
//
//     const handleControlVisibility = () => {
//         setControlVisible(prev => !prev);
//     };
//
//     return (
//         <div className="container">
//             <h1>ESP8266 WebSocket Control</h1>
//
//             <div className="status">
//                 Status: {isConnected ?
//                 (isIdentified ? `✅ Connected (ESP: ${espConnected ? '✅' : '❌'})` : "🟡 Connecting") :
//                 "❌ Disconnected"}
//             </div>
//
//             <div className="connection-control">
//                 <input
//                     type="text"
//                     value={inputDeviceId}
//                     onChange={(e) => setInputDeviceId(e.target.value)}
//                     disabled={isConnected}
//                 />
//                 <button onClick={connectWebSocket} disabled={isConnected}>
//                     Connect
//                 </button>
//                 <button onClick={disconnectWebSocket} disabled={!isConnected}>
//                     Disconnect
//                 </button>
//             </div>
//
//             <button onClick={handleControlVisibility}>
//                 {controlVisible ? "Hide Controls" : "Show Controls"}
//             </button>
//
//             {controlVisible && (
//                 <div className="control-panel">
//                     <div className="tank-controls">
//                         <div className="motor-control">
//                             <input
//                                 ref={motorARef}
//                                 type="range"
//                                 min="-255"
//                                 max="255"
//                                 defaultValue="0"
//                                 onChange={handleSliderChange('A')}
//                                 onMouseUp={() => handleSliderRelease('A')}
//                                 onTouchEnd={() => handleSliderRelease('A')}
//                                 className="vertical-slider"
//                             />
//                             <div>
//                                 Motor A: {lastCommandRef.current.A.speed} ({lastCommandRef.current.A.direction})
//                             </div>
//                         </div>
//
//                         <div className="motor-control">
//                             <input
//                                 ref={motorBRef}
//                                 type="range"
//                                 min="-255"
//                                 max="255"
//                                 defaultValue="0"
//                                 onChange={handleSliderChange('B')}
//                                 onMouseUp={() => handleSliderRelease('B')}
//                                 onTouchEnd={() => handleSliderRelease('B')}
//                                 className="vertical-slider"
//                             />
//                             <div>
//                                 Motor B: {lastCommandRef.current.B.speed} ({lastCommandRef.current.B.direction})
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}
//
//             <div className="log-container">
//                 <h3>Event Log</h3>
//                 <div className="log-content">
//                     {log.slice().reverse().map((entry, index) => (
//                         <div key={index} className={`log-entry ${entry.type}`}>
//                             {entry.message}
//                         </div>
//                     ))}
//                 </div>
//             </div>
//
//             <style jsx>{`
//                 .container {
//                     max-width: 800px;
//                     margin: 0 auto;
//                     padding: 20px;
//                     font-family: Arial;
//                 }
//                 .status {
//                     margin: 10px 0;
//                     padding: 10px;
//                     background: ${isConnected ?
//                 (isIdentified ?
//                     (espConnected ? '#e6f7e6' : '#fff3e0') :
//                     '#fff3e0') :
//                 '#ffebee'};
//                     border-radius: 4px;
//                 }
//                 .connection-control {
//                     display: flex;
//                     gap: 10px;
//                     margin: 15px 0;
//                     padding: 15px;
//                     background: #f5f5f5;
//                     border-radius: 8px;
//                 }
//                 button {
//                     padding: 10px 15px;
//                     background: #2196f3;
//                     color: white;
//                     border: none;
//                     border-radius: 4px;
//                     cursor: pointer;
//                 }
//                 button:disabled {
//                     background: #b0bec5;
//                     cursor: not-allowed;
//                 }
//                 .control-panel {
//                     margin: 20px 0;
//                     padding: 15px;
//                     background: #f5f5f5;
//                     border-radius: 8px;
//                 }
//                 .tank-controls {
//                     display: flex;
//                     justify-content: space-between;
//                     gap: 20px;
//                     height: 50vh;
//                 }
//                 .motor-control {
//                     flex: 1;
//                     display: flex;
//                     flex-direction: column;
//                     align-items: center;
//                 }
//                 .vertical-slider {
//                     width: 80px;
//                     height: 100%;
//                     -webkit-appearance: slider-vertical;
//                     writing-mode: bt-lr;
//                 }
//                 .log-container {
//                     border: 1px solid #ddd;
//                     border-radius: 8px;
//                     overflow: hidden;
//                 }
//                 .log-content {
//                     height: 300px;
//                     overflow-y: auto;
//                     padding: 10px;
//                     background: #fafafa;
//                 }
//                 .log-entry {
//                     margin: 5px 0;
//                     padding: 5px;
//                     border-bottom: 1px solid #eee;
//                     font-family: monospace;
//                     font-size: 14px;
//                 }
//                 .log-entry.client { color: #2196F3; }
//                 .log-entry.esp { color: #4CAF50; }
//                 .log-entry.server { color: #9C27B0; }
//                 .log-entry.error { color: #F44336; font-weight: bold; }
//
//                 @media (max-width: 768px) {
//                     .tank-controls {
//                         flex-direction: column;
//                         height: 70vh;
//                     }
//                     .motor-control {
//                         height: 50%;
//                     }
//                     .vertical-slider {
//                         height: 80%;
//                     }
//                 }
//             `}</style>
//         </div>
//     );
// }