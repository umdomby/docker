'use client';

type SignalingEvent = 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'error' | 'pong';
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
    private reconnectDelay = 2000;
    private explicitClose = false;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private connectionTimeout: NodeJS.Timeout | null = null;

    constructor(private readonly url: string) {
        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        this.eventHandlers.set('offer', new Set());
        this.eventHandlers.set('answer', new Set());
        this.eventHandlers.set('ice-candidate', new Set());
        this.eventHandlers.set('error', new Set());
        this.eventHandlers.set('pong', new Set());
    }

    async connect(roomId: string): Promise<void> {
        if (this.connectionPromise) return this.connectionPromise;

        this.roomId = roomId;
        this.explicitClose = false;

        try {
            this.ws = new WebSocket(this.url);
            this.connectionPromise = this.setupWebSocketHandlers();
            return this.connectionPromise;
        } catch (err) {
            return Promise.reject(new Error('WebSocket initialization failed'));
        }
    }

    private setupWebSocketHandlers(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.ws) {
                reject(new Error('WebSocket not initialized'));
                return;
            }

            // Set connection timeout (10 seconds)
            this.connectionTimeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
                this.ws?.close();
            }, 10000);

            this.ws.onopen = () => {
                this.clearConnectionTimeout();
                this.reconnectAttempts = 0;
                this.send({ event: 'join', room: this.roomId });
                this.flushMessageQueue();
                this.startHeartbeat();
                console.log('[WebSocket] Connected to', this.url);
                resolve();
            };

            this.ws.onerror = (event: Event) => {
                this.clearConnectionTimeout();
                const error = event instanceof ErrorEvent ? event.message : 'WebSocket error';
                console.error('[WebSocket] Error:', error);

                if (!this.explicitClose && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect(reject);
                } else {
                    reject(new Error(`Connection failed after ${this.maxReconnectAttempts} attempts`));
                }
            };

            this.ws.onclose = (event: CloseEvent) => {
                this.clearConnectionTimeout();
                this.handleCloseEvent(event);
            };

            this.ws.onmessage = (event: MessageEvent) => {
                try {
                    const msg = this.parseMessage(event.data);
                    if (msg.event === 'pong') {
                        this.triggerEvent('pong', {});
                    } else {
                        this.handleMessage(msg);
                    }
                } catch (error) {
                    console.error('[WebSocket] Message parse error:', error);
                    this.triggerEvent('error', 'Invalid message format');
                }
            };
        });
    }

    private clearConnectionTimeout() {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
    }

    private startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.send({ event: 'ping' });
            }
        }, 25000);
    }

    private handleCloseEvent(event: CloseEvent) {
        console.log('[WebSocket] Closed:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
        });

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        if (!this.explicitClose && event.code !== 1000) {
            this.triggerEvent('error', `Connection closed: ${event.reason || 'Unknown reason'}`);
        }
    }

    private scheduleReconnect(reject: (reason?: any) => void) {
        const delay = this.calculateReconnectDelay();
        console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

        setTimeout(() => {
            this.reconnectAttempts++;
            this.connect(this.roomId).catch(reject);
        }, delay);
    }

    private calculateReconnectDelay(): number {
        return Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    }

    private parseMessage(data: any): SignalingMessage {
        try {
            return JSON.parse(data) as SignalingMessage;
        } catch (err) {
            throw new Error('Failed to parse message');
        }
    }

    private triggerEvent(event: SignalingEvent, data: any): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => handler(data));
        }
    }

    send(message: SignalingMessage): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(message));
            } catch (err) {
                console.error('[WebSocket] Send error:', err);
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
        this.explicitClose = true;
        if (this.ws) {
            this.ws.close(1000, 'Normal closure');
        }
        this.cleanup();
    }

    private handleMessage(msg: SignalingMessage): void {
        const handlers = this.eventHandlers.get(msg.event);
        if (handlers) {
            handlers.forEach(handler => handler(msg.data));
        }
    }

    private flushMessageQueue(): void {
        while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
            const msg = this.messageQueue.shift();
            if (msg) {
                try {
                    this.ws.send(JSON.stringify(msg));
                } catch (err) {
                    console.error('[WebSocket] Queue flush error:', err);
                    this.messageQueue.unshift(msg);
                    break;
                }
            }
        }
    }

    private cleanup(): void {
        this.clearConnectionTimeout();

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        this.connectionPromise = null;
        this.messageQueue = [];
        this.ws = null;
    }
}