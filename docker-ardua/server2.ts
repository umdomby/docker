import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { readFileSync } from 'fs';
import { getAllowedDeviceIds } from './app/actions';
import { createServer } from 'https';

const path = require('path');
const PORT = 444;
//const server = createServer();
//Загрузите ваши SSL-сертификаты
const server = createServer({
    key: readFileSync('/etc/letsencrypt/live/ardu.site/privkey.pem'),
    cert: readFileSync('/etc/letsencrypt/live/ardu.site/fullchain.pem'),
});
// Загрузите ваши SSL-сертификаты
// const server = createServer({
//     cert: readFileSync('/etc/letsencrypt/live/ardu.site/fullchain.pem'),
//     key: readFileSync('/etc/letsencrypt/live/ardu.site/privkey.pem')
// });

const wss = new WebSocketServer({ server });

interface ClientInfo {
    ws: WebSocket;
    deviceId?: string;
    ip: string;
    isIdentified: boolean;
    clientType?: 'browser' | 'esp';
    lastActivity: number;
    isAlive: boolean;
}

const clients = new Map<number, ClientInfo>();

// Ping clients every 30 seconds
setInterval(() => {
    clients.forEach((client, clientId) => {
        if (!client.isAlive) {
            client.ws.terminate();
            clients.delete(clientId);
            console.log(`Client ${clientId} terminated (no ping response)`);
            return;
        }
        client.isAlive = false;
        client.ws.ping(null, false);
    });
}, 30000);

wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const clientId = Date.now();
    const ip = req.socket.remoteAddress || 'unknown';
    const client: ClientInfo = {
        ws,
        ip,
        isIdentified: false,
        lastActivity: Date.now(),
        isAlive: true
    };
    clients.set(clientId, client);

    console.log(`New connection: ${clientId} from ${ip}`);

    ws.on('pong', () => {
        client.isAlive = true;
        client.lastActivity = Date.now();
    });

    ws.send(JSON.stringify({
        type: 'system',
        message: 'Connection established',
        clientId,
        status: 'awaiting_identification'
    }));

    ws.on('message', async (data: Buffer) => {
        try {
            client.lastActivity = Date.now();
            const message = data.toString();
            console.log(`[${clientId}] Received: ${message}`);
            const parsed = JSON.parse(message);

            if (parsed.type === 'client_type') {
                client.clientType = parsed.clientType;
                return;
            }

            if (parsed.type === 'identify') {
                const allowedIds = new Set(await getAllowedDeviceIds());
                if (parsed.deviceId && allowedIds.has(parsed.deviceId)) {
                    client.deviceId = parsed.deviceId;
                    client.isIdentified = true;

                    ws.send(JSON.stringify({
                        type: 'system',
                        message: 'Identification successful',
                        clientId,
                        deviceId: parsed.deviceId,
                        status: 'connected'
                    }));

                    // Notify browser clients about ESP connection
                    if (client.clientType === 'esp') {
                        clients.forEach(targetClient => {
                            if (targetClient.clientType === 'browser' &&
                                targetClient.deviceId === parsed.deviceId) {
                                console.log(`Notifying browser client ${targetClient.deviceId} about ESP connection`);
                                targetClient.ws.send(JSON.stringify({
                                    type: 'esp_status',
                                    status: 'connected',
                                    deviceId: parsed.deviceId,
                                    timestamp: new Date().toISOString()
                                }));
                            }
                        });
                    }
                } else {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid device ID',
                        clientId,
                        status: 'rejected'
                    }));
                    ws.close();
                }
                return;
            }

            if (!client.isIdentified) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Not identified',
                    clientId
                }));
                return;
            }

            // Process logs from ESP
            if (parsed.type === 'log' && client.clientType === 'esp') {
                clients.forEach(targetClient => {
                    if (targetClient.clientType === 'browser' &&
                        targetClient.deviceId === client.deviceId) {
                        targetClient.ws.send(JSON.stringify({
                            type: 'log',
                            message: parsed.message,
                            deviceId: client.deviceId,
                            timestamp: new Date().toISOString(),
                            origin: 'esp'
                        }));
                    }
                });
                return;
            }

            // Process command acknowledgements
            if (parsed.type === 'command_ack' && client.clientType === 'esp') {
                clients.forEach(targetClient => {
                    if (targetClient.clientType === 'browser' &&
                        targetClient.deviceId === client.deviceId) {
                        targetClient.ws.send(JSON.stringify({
                            type: 'command_ack',
                            command: parsed.command,
                            deviceId: client.deviceId,
                            timestamp: new Date().toISOString()
                        }));
                    }
                });
                return;
            }

            // Route commands to ESP
            if (parsed.command && parsed.deviceId) {
                let delivered = false;
                clients.forEach(targetClient => {
                    if (targetClient.deviceId === parsed.deviceId &&
                        targetClient.clientType === 'esp' &&
                        targetClient.isIdentified) {
                        targetClient.ws.send(message);
                        delivered = true;
                    }
                });

                ws.send(JSON.stringify({
                    type: delivered ? 'command_status' : 'error',
                    status: delivered ? 'delivered' : 'esp_not_found',
                    command: parsed.command,
                    deviceId: parsed.deviceId,
                    timestamp: new Date().toISOString()
                }));
            }

        } catch (err) {
            console.error(`[${clientId}] Message error:`, err);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format',
                error: (err as Error).message,
                clientId
            }));
        }
    });

    ws.on('close', () => {
        console.log(`Client ${clientId} disconnected`);
        if (client.clientType === 'esp' && client.deviceId) {
            clients.forEach(targetClient => {
                if (targetClient.clientType === 'browser' &&
                    targetClient.deviceId === client.deviceId) {
                    targetClient.ws.send(JSON.stringify({
                        type: 'esp_status',
                        status: 'disconnected',
                        deviceId: client.deviceId,
                        timestamp: new Date().toISOString(),
                        reason: 'connection closed'
                    }));
                }
            });
        }
        clients.delete(clientId);
    });

    ws.on('error', (err: Error) => {
        console.error(`[${clientId}] WebSocket error:`, err);
    });
});

server.listen(PORT, () => {
    console.log(`WebSocket server running on wss://0.0.0.0:${PORT}`);
});