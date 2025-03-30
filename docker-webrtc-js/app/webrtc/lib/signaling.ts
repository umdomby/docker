'use client';

type SignalingEvent = 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'error';
type EventCallback<T = any> = (data: T) => void;

interface SignalingMessage {
    event: SignalingEvent;
    data: unknown;
    room?: string;
}

export class SignalingClient {
    private ws: WebSocket | null = null;
    private roomId: string = '';
    private messageQueue: SignalingMessage[] = [];
    private eventHandlers = new Map<SignalingEvent, Set<EventCallback>>();
    private connectionPromise: Promise<void> | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;
    private reconnectDelay = 1000;

    constructor(private readonly url: string) {}

    async connect(roomId: string): Promise<void> {
        if (this.connectionPromise) return this.connectionPromise;

        this.roomId = roomId;
        this.ws = new WebSocket(this.url);

        this.connectionPromise = new Promise((resolve, reject) => {
            if (!this.ws) {
                reject(new Error('WebSocket initialization failed'));
                return;
            }

            this.ws.onopen = () => {
                this.reconnectAttempts = 0;
                this.send({ event: 'join', room: roomId });
                this.flushMessageQueue();
                resolve();
            };

            this.ws.onerror = (event) => {
                console.error('WebSocket error details:', event);
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    setTimeout(() => {
                        this.reconnectAttempts++;
                        this.connect(roomId).catch(reject);
                    }, this.reconnectDelay);
                } else {
                    reject(new Error(`WebSocket connection failed after ${this.maxReconnectAttempts} attempts`));
                    this.triggerEvent('error', 'Connection failed');
                }
            };

            this.ws.onclose = (event) => {
                if (event.code !== 1000) {
                    console.warn(`WebSocket closed unexpectedly: ${event.code} ${event.reason}`);
                    this.triggerEvent('error', `Connection closed: ${event.reason || 'Unknown reason'}`);
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data) as SignalingMessage;
                    this.handleMessage(msg);
                } catch (error) {
                    console.error('Error parsing message:', error);
                    this.triggerEvent('error', 'Invalid message format');
                }
            };
        });

        return this.connectionPromise;
    }

    private triggerEvent(event: SignalingEvent, data: any): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => handler(data));
        }
    }

    send<T>(message: SignalingMessage): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(message));
            } catch (err) {
                console.error('Send error:', err);
                this.messageQueue.push(message);
            }
        } else {
            this.messageQueue.push(message);
        }
    }

    on<T>(event: SignalingEvent, callback: EventCallback<T>): () => void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)?.add(callback);
        return () => this.off(event, callback);
    }

    off<T>(event: SignalingEvent, callback: EventCallback<T>): void {
        this.eventHandlers.get(event)?.delete(callback);
    }

    close(): void {
        if (this.ws) {
            this.ws.close(1000, 'Normal closure');
            this.cleanup();
        }
    }

    private handleMessage(event: MessageEvent): void {
        try {
            const msg = JSON.parse(event.data) as SignalingMessage;
            const handlers = this.eventHandlers.get(msg.event);

            if (handlers) {
                handlers.forEach(handler => handler(msg.data));
            }
        } catch (error) {
            console.error('Error parsing signaling message:', error);
            this.triggerEvent('error', 'Message parse error');
        }
    }

    private flushMessageQueue(): void {
        while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
            const msg = this.messageQueue.shift();
            if (msg) {
                try {
                    this.ws.send(JSON.stringify(msg));
                } catch (err) {
                    console.error('Queue flush error:', err);
                    this.messageQueue.unshift(msg);
                    break;
                }
            }
        }
    }

    private cleanup(): void {
        this.connectionPromise = null;
        this.messageQueue = [];
    }
}