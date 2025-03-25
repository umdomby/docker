import { WebSocketServer, WebSocket, RawData } from 'ws';
import { IncomingMessage } from 'http';
import { getAllowedDeviceIds } from './app/actions';

const PORT = 8080;

const wss = new WebSocketServer({
    port: PORT,
    clientTracking: true,
    perMessageDeflate: {
        zlibDeflateOptions: { level: 3 }
    }
});

// Хранилище активных соединений
const clients = new Map<number, { ws: WebSocket, deviceId?: string }>();

wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const clientId = Date.now();
    const clientIp = req.socket.remoteAddress;
    clients.set(clientId, { ws });

    console.log(`New connection [ID: ${clientId}, IP: ${clientIp}]`);

    // Получение разрешенных идентификаторов из базы данных
    const allowedDeviceIds = new Set(await getAllowedDeviceIds());

    ws.on('message', (data: RawData, isBinary: boolean) => {
        try {
            const message = isBinary ? data : data.toString();
            console.log(`[${clientId}] Received:`, message);

            const parsed = JSON.parse(message.toString());

            if (parsed.type === 'identify' && parsed.deviceId) {
                if (allowedDeviceIds.has(parsed.deviceId)) {
                    clients.get(clientId)!.deviceId = parsed.deviceId;
                    console.log(`Client ${clientId} identified as device ${parsed.deviceId}`);
                } else {
                    console.log(`Client ${clientId} attempted to connect with invalid device ID: ${parsed.deviceId}`);
                    ws.close(); // Закрыть соединение, если идентификатор устройства не разрешен
                }
            }

            // Обработка других сообщений
            if (parsed.command === 'ping') {
                ws.send(JSON.stringify({
                    type: 'pong',
                    timestamp: Date.now(),
                    original: parsed
                }));
            }

        } catch (err) {
            console.error(`[${clientId}] Message error:`, err);
            ws.send(JSON.stringify({
                type: "error",
                message: "Invalid message format",
                error: (err as Error).message
            }));
        }
    });

    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`Client ${clientId} disconnected [Remaining: ${clients.size}]`);
    });

    ws.on('error', (err: Error) => {
        console.error(`[${clientId}] Error:`, err);
    });
});

console.log(`WebSocket server running on ws://0.0.0.0:${PORT}`);