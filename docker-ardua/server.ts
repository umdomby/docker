import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { getAllowedDeviceIds } from './app/actions';

const PORT = 8080;

const wss = new WebSocketServer({
    port: PORT,
    clientTracking: true
});

interface ClientInfo {
    ws: WebSocket;
    deviceId?: string;
    ip: string;
    isIdentified: boolean;
}

const clients = new Map<number, ClientInfo>();

wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const clientId = Date.now();
    const clientIp = req.socket.remoteAddress || 'unknown';
    const client: ClientInfo = { ws, ip: clientIp, isIdentified: false };
    clients.set(clientId, client);

    console.log(`New connection [ID: ${clientId}, IP: ${clientIp}]`);

    // Получаем разрешенные deviceId из базы данных
    const allowedDeviceIds = new Set(await getAllowedDeviceIds());

    // Приветственное сообщение
    ws.send(JSON.stringify({
        type: "system",
        message: "Connection established",
        clientId,
        status: "awaiting_identification"
    }));

    ws.on('message', async (data: Buffer) => {
        try {
            const message = data.toString();
            console.log(`[${clientId}] Received:`, message);
            const parsed = JSON.parse(message);

            // Обработка идентификации
            if (parsed.type === 'identify') {
                if (parsed.deviceId && allowedDeviceIds.has(parsed.deviceId)) {
                    client.deviceId = parsed.deviceId;
                    client.isIdentified = true;

                    ws.send(JSON.stringify({
                        type: "system",
                        message: "Identification successful",
                        clientId,
                        deviceId: parsed.deviceId,
                        status: "connected"
                    }));

                    console.log(`Client ${clientId} identified as device ${parsed.deviceId}`);
                } else {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Invalid device ID",
                        clientId,
                        status: "rejected"
                    }));
                    ws.close();
                }
                return;
            }

            // Проверка идентификации для команд
            if (!client.isIdentified) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Please identify first",
                    clientId,
                    status: "unidentified"
                }));
                return;
            }

            // Маршрутизация сообщений для ESP8266
            if (parsed.command && parsed.deviceId) {
                clients.forEach((targetClient, id) => {
                    if (targetClient.deviceId === parsed.deviceId &&
                        targetClient.isIdentified &&
                        id !== clientId) {
                        targetClient.ws.send(message);
                    }
                });
            }

        } catch (err) {
            console.error(`[${clientId}] Message error:`, err);
            ws.send(JSON.stringify({
                type: "error",
                message: "Invalid message format",
                error: (err as Error).message,
                clientId
            }));
        }
    });

    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`Client ${clientId} disconnected`);
    });

    ws.on('error', (err) => {
        console.error(`[${clientId}] WebSocket error:`, err);
    });
});

console.log(`WebSocket server running on ws://0.0.0.0:${PORT}`);