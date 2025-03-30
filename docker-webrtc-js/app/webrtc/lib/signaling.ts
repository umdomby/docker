'use client';

type SignalingEvent = 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave';
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
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private isManualClose = false;

    constructor(private readonly url: string) {
        this.setupEventHandlers();
    }

    async connect(roomId: string): Promise<void> {
        if (this.connectionPromise) return this.connectionPromise;

        this.roomId = roomId;
        this.isManualClose = false;
        this.ws = new WebSocket(this.url);

        this.connectionPromise = new Promise((resolve, reject) => {
            if (!this.ws) {
                reject(new Error('WebSocket initialization failed'));
                return;
            }

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                this.send({ event: 'join', room: roomId });
                this.flushMessageQueue();
                resolve();
            };

            this.ws.onerror = (event) => {
                console.error('WebSocket error:', event);
                reject(new Error('WebSocket connection error'));
            };

            this.ws.onclose = (event) => {
                console.log(`WebSocket closed (code: ${event.code}, reason: ${event.reason})`);
                this.cleanup();

                if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    const delay = this.getReconnectDelay();
                    console.log(`Attempting reconnect #${this.reconnectAttempts} in ${delay}ms...`);
                    setTimeout(() => this.connect(roomId), delay);
                }
            };

            this.ws.onmessage = (event) => this.handleMessage(event);
        });

        return this.connectionPromise;
    }

    send(message: SignalingMessage): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(message));
            } catch (err) {
                console.error('Error sending message:', err);
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
        this.isManualClose = true;
        if (this.ws) {
            this.send({ event: 'leave', room: this.roomId });
            this.ws.close();
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
        }
    }

    private flushMessageQueue(): void {
        while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
            const msg = this.messageQueue.shift();
            if (msg) {
                try {
                    this.ws.send(JSON.stringify(msg));
                } catch (err) {
                    console.error('Error flushing message queue:', err);
                    this.messageQueue.unshift(msg);
                    break;
                }
            }
        }
    }

    private getReconnectDelay(): number {
        return Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    }

    private setupEventHandlers(): void {
        this.eventHandlers.set('offer', new Set());
        this.eventHandlers.set('answer', new Set());
        this.eventHandlers.set('ice-candidate', new Set());
    }

    private cleanup(): void {
        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onerror = null;
            this.ws.onclose = null;
            this.ws.onmessage = null;
        }
        this.connectionPromise = null;
        this.ws = null;
    }

    get readyState(): number {
        return this.ws?.readyState || WebSocket.CLOSED;
    }
}