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

    constructor(private readonly url: string) {
        this.setupEventHandlers();
    }

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
                this.send({ event: 'join', room: roomId });
                this.flushMessageQueue();
                resolve();
            };

            this.ws.onerror = (event) => {
                reject(new Error(`WebSocket error: ${event.type}`));
                this.cleanup();
            };

            this.ws.onclose = () => {
                this.send({ event: 'leave', room: roomId });
                this.cleanup();
            };
        });

        return this.connectionPromise;
    }

    send<T>(message: SignalingMessage): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
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
            if (msg) this.ws.send(JSON.stringify(msg));
        }
    }

    private setupEventHandlers(): void {
        this.eventHandlers.set('offer', new Set());
        this.eventHandlers.set('answer', new Set());
        this.eventHandlers.set('ice-candidate', new Set());
    }

    private cleanup(): void {
        this.connectionPromise = null;
        this.eventHandlers.forEach(handlers => handlers.clear());
    }
}