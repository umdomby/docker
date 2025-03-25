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
    clientType?: 'browser' | 'esp';
}

const clients = new Map<number, ClientInfo>();

wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const clientId = Date.now();
    const clientIp = req.socket.remoteAddress || 'unknown';
    const client: ClientInfo = { ws, ip: clientIp, isIdentified: false };
    clients.set(clientId, client);

    console.log(`New connection [ID: ${clientId}, IP: ${clientIp}]`);

    const allowedDeviceIds = new Set(await getAllowedDeviceIds());

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

            if (parsed.type === 'client_type') {
                client.clientType = parsed.clientType;
                return;
            }

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

                    // Уведомляем всех браузерных клиентов с этим deviceId
                    clients.forEach((targetClient, id) => {
                        if (targetClient.clientType === 'browser' &&
                            targetClient.deviceId === parsed.deviceId) {
                            targetClient.ws.send(JSON.stringify({
                                type: "esp_status",
                                status: "connected",
                                deviceId: parsed.deviceId,
                                timestamp: new Date().toISOString()
                            }));
                        }
                    });
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

            if (!client.isIdentified) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Please identify first",
                    clientId,
                    status: "unidentified"
                }));
                return;
            }

            // Пересылка логов от ESP клиентам браузера
            if (parsed.type === 'log' && client.clientType === 'esp') {
                clients.forEach((targetClient, id) => {
                    if (targetClient.clientType === 'browser' &&
                        targetClient.deviceId === client.deviceId) {
                        targetClient.ws.send(JSON.stringify({
                            type: 'log',
                            message: parsed.message,
                            deviceId: client.deviceId,
                            timestamp: new Date().toISOString()
                        }));
                    }
                });
                return;
            }

            // Маршрутизация команд для ESP8266
            if (parsed.command && parsed.deviceId) {
                clients.forEach((targetClient, id) => {
                    if (targetClient.deviceId === parsed.deviceId &&
                        targetClient.isIdentified &&
                        targetClient.clientType === 'esp' &&
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
        // Если отключается ESP, уведомляем браузерных клиентов
        if (client.clientType === 'esp' && client.deviceId) {
            clients.forEach((targetClient, id) => {
                if (targetClient.clientType === 'browser' &&
                    targetClient.deviceId === client.deviceId) {
                    targetClient.ws.send(JSON.stringify({
                        type: "esp_status",
                        status: "disconnected",
                        deviceId: client.deviceId,
                        timestamp: new Date().toISOString()
                    }));
                }
            });
        }

        clients.delete(clientId);
        console.log(`Client ${clientId} disconnected`);
    });

    ws.on('error', (err) => {
        console.error(`[${clientId}] WebSocket error:`, err);
    });
});

console.log(`WebSocket server running on ws://0.0.0.0:${PORT}`);