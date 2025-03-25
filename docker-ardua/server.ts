import { WebSocketServer, WebSocket, RawData } from 'ws';
import { IncomingMessage } from 'http';

const PORT = 8080;

const wss = new WebSocketServer({
    port: PORT,
    clientTracking: true,
    perMessageDeflate: {
        zlibDeflateOptions: { level: 3 }
    }
});

// Хранилище активных соединений
const clients = new Map<number, WebSocket>();

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const clientId = Date.now();
    const clientIp = req.socket.remoteAddress;
    clients.set(clientId, ws);

    console.log(`New connection [ID: ${clientId}, IP: ${clientIp}]`);

    // Отправка приветственного сообщения
    ws.send(JSON.stringify({
        type: "system",
        message: "Connection established",
        id: clientId,
        clients: clients.size
    }));

    ws.on('message', (data: RawData, isBinary: boolean) => {
        try {
            const message = isBinary ? data : data.toString();
            console.log(`[${clientId}] Received:`, message);

            // Базовый парсинг для проверки JSON
            const parsed = JSON.parse(message.toString());

            // Трансляция сообщения всем клиентам (кроме отправителя)
            clients.forEach((client, id) => {
                if (id !== clientId && client.readyState === client.OPEN) {
                    client.send(message);
                }
            });

            // Обработка специальных команд
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
