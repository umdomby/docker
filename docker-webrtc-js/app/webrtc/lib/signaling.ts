// app/webrtc/lib/signaling.ts
import {
    RoomCreatedData,
    WebRTCOffer,
    WebRTCAnswer,
    WebRTCCandidate,
    SignalingClientOptions
} from '../types';

export class SignalingClient {
    private ws: WebSocket | null = null;
    private messageQueue: Array<{event: string, data: any}> = [];
    private reconnectAttempts = 0;
    private connectionTimeout: NodeJS.Timeout | null = null;
    private pingInterval: NodeJS.Timeout | null = null;
    private connectionPromise: Promise<void> | null = null;
    private resolveConnection: (() => void) | null = null;
    private lastJoinedUser: string | null = null;

    public onRoomCreated: (data: RoomCreatedData) => void = () => {};
    public onOffer: (data: WebRTCOffer) => void = () => {};
    public onAnswer: (data: WebRTCAnswer) => void = () => {};
    public onCandidate: (data: WebRTCCandidate) => void = () => {};
    public onUserJoined: (username: string) => void = () => {};
    public onUserLeft: (username: string) => void = () => {};
    public onError: (error: string) => void = () => {};

    constructor(
        private url: string,
        private options: SignalingClientOptions = {}
    ) {
        this.options = {
            maxReconnectAttempts: 5,
            reconnectDelay: 1000,
            connectionTimeout: 5000,
            ...options
        };
        this.connect();
    }

    public get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    private connect(): void {
        this.ws = new WebSocket(this.url);
        this.setupEventListeners();

        this.connectionTimeout = setTimeout(() => {
            if (!this.isConnected) {
                this.handleError('Connection timeout');
                this.ws?.close();
            }
        }, this.options.connectionTimeout);
    }

    private setupEventListeners(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            this.clearTimeout(this.connectionTimeout);
            this.reconnectAttempts = 0;
            console.log('Signaling connection established');

            if (this.resolveConnection) {
                this.resolveConnection();
                this.resolveConnection = null;
                this.connectionPromise = null;
            }

            this.pingInterval = setInterval(() => this.sendPing(), 30000);
            this.flushMessageQueue();
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.debug('Received message:', message.event);

                if (message.event === 'user_joined' && this.lastJoinedUser === message.data.username) {
                    return;
                }

                switch (message.event) {
                    case 'joined':
                        this.onRoomCreated(message.data);
                        break;
                    case 'offer':
                        this.onOffer(message.data);
                        break;
                    case 'answer':
                        this.onAnswer(message.data);
                        break;
                    case 'candidate':
                        this.onCandidate(message.data);
                        break;
                    case 'user_joined':
                        this.lastJoinedUser = message.data.username;
                        this.onUserJoined(message.data.username);
                        break;
                    case 'user_left':
                        this.onUserLeft(message.data.username);
                        this.lastJoinedUser = null;
                        break;
                    case 'error':
                        this.onError(message.data);
                        break;
                    case 'ping':
                        this.sendPong();
                        break;
                    case 'pong':
                        break;
                    default:
                        console.warn('Unknown message type:', message.event);
                }
            } catch (error) {
                this.handleError('Invalid message format');
            }
        };

        this.ws.onclose = () => {
            console.log('Signaling connection closed');
            this.cleanup();
            this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
            this.handleError(`Connection error: ${error}`);
        };
    }

    private async flushMessageQueue(): Promise<void> {
        while (this.messageQueue.length > 0 && this.isConnected) {
            const message = this.messageQueue.shift();
            if (message) await this.sendMessageInternal(message);
        }
    }

    private async sendMessageInternal(message: { event: string; data: any }): Promise<void> {
        if (!this.isConnected) {
            throw new Error('WebSocket not connected');
        }

        try {
            this.ws?.send(JSON.stringify(message));
        } catch (error) {
            console.error('Send failed, requeuing message:', message.event);
            this.messageQueue.unshift(message);
            throw error;
        }
    }

    public async sendMessage(message: { event: string; data: any }): Promise<void> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            if (!this.connectionPromise) {
                this.connectionPromise = new Promise((resolve, reject) => {
                    this.resolveConnection = resolve;
                    setTimeout(() => {
                        reject(new Error('Connection timeout'));
                        this.cleanup();
                    }, this.options.connectionTimeout || 5000);
                });
            }
            this.messageQueue.push(message);
            await this.connectionPromise;
            return this.sendMessage(message);
        }

        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('Send error:', error);
            throw error;
        }
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts >= (this.options.maxReconnectAttempts || 5)) {
            return this.handleError('Max reconnection attempts reached');
        }

        this.reconnectAttempts++;
        console.log(`Reconnecting (attempt ${this.reconnectAttempts})`);

        setTimeout(() => this.connect(), this.options.reconnectDelay);
    }

    private handleError(error: string): void {
        console.error('Signaling error:', error);
        this.onError(error);
        this.cleanup();
    }

    private cleanup(): void {
        this.clearTimeout(this.connectionTimeout);
        this.clearInterval(this.pingInterval);
        this.lastJoinedUser = null;
    }

    private clearTimeout(timer: NodeJS.Timeout | null): void {
        if (timer) clearTimeout(timer);
    }

    private clearInterval(timer: NodeJS.Timeout | null): void {
        if (timer) clearInterval(timer);
    }

    private sendPing(): void {
        this.sendMessage({ event: 'ping', data: null }).catch(() => {});
    }

    private sendPong(): void {
        this.sendMessage({ event: 'pong', data: null }).catch(() => {});
    }

    public close(): void {
        this.cleanup();
        this.ws?.close();
        this.messageQueue = [];
    }

    public createRoom(username: string): Promise<void> {
        return this.sendMessage({
            event: 'join',
            data: { roomId: '', username }
        });
    }

    public joinRoom(roomId: string, username: string): Promise<void> {
        return this.sendMessage({
            event: 'join',
            data: { roomId, username }
        });
    }

    public sendOffer(data: { offer: RTCSessionDescriptionInit; to: string }): Promise<void> {
        return this.sendMessage({
            event: 'offer',
            data: { offer: data.offer, to: data.to }
        });
    }

    public sendAnswer(data: { answer: RTCSessionDescriptionInit; to: string }): Promise<void> {
        return this.sendMessage({
            event: 'answer',
            data: { answer: data.answer, to: data.to }
        });
    }

    public sendCandidate(data: { candidate: RTCIceCandidateInit; to: string }): Promise<void> {
        return this.sendMessage({
            event: 'candidate',
            data: { candidate: data.candidate, to: data.to }
        });
    }
}