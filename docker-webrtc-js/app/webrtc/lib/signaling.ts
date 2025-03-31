// file: docker-webrtc-js/app/webrtc/lib/signaling.ts
export class SignalingClient {
    private ws: WebSocket;
    private onOfferCallback: (data: { offer: RTCSessionDescriptionInit; from: string }) => void = () => {};
    private onAnswerCallback: (data: { answer: RTCSessionDescriptionInit; from: string }) => void = () => {};
    private onCandidateCallback: (data: { candidate: RTCIceCandidateInit; from: string }) => void = () => {};
    private onRoomCreatedCallback: (data: { roomId: string; clients: string[] }) => void = () => {};
    private onUserJoinedCallback: (username: string) => void = () => {};
    private onUserLeftCallback: (username: string) => void = () => {};
    private onErrorCallback: (error: string) => void = () => {};
    private messageQueue: Array<{event: string, data: any}> = [];
    private isConnected = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private connectionTimeout: NodeJS.Timeout | null = null;
    private pingInterval: NodeJS.Timeout | null = null;
    private connectionPromise: Promise<void>;
    private resolveConnection: (() => void) | null = null;

    constructor(url: string) {
        this.connectionPromise = new Promise((resolve) => {
            this.resolveConnection = resolve;
        });

        this.ws = new WebSocket(url);
        this.setupEventListeners();

        this.connectionTimeout = setTimeout(() => {
            if (!this.isConnected) {
                this.onErrorCallback('Connection timeout');
                this.ws.close();
            }
        }, 5000);
    }

    private setupEventListeners() {
        this.ws.onopen = () => {
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }

            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log('Signaling connection established');

            if (this.resolveConnection) {
                this.resolveConnection();
                this.resolveConnection = null;
            }

            this.pingInterval = setInterval(() => this.sendPing(), 30000);
            this.flushMessageQueue();
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.debug('Received signaling message:', message);

                switch (message.event) {
                    case 'joined':
                        this.onRoomCreatedCallback(message.data);
                        break;
                    case 'offer':
                        this.onOfferCallback({
                            offer: message.data.offer,
                            from: message.data.from
                        });
                        break;
                    case 'answer':
                        this.onAnswerCallback({
                            answer: message.data.answer,
                            from: message.data.from
                        });
                        break;
                    case 'candidate':
                        this.onCandidateCallback({
                            candidate: message.data.candidate,
                            from: message.data.from
                        });
                        break;
                    case 'user_joined':
                        this.onUserJoinedCallback(message.data.username);
                        break;
                    case 'user_left':
                        this.onUserLeftCallback(message.data.username);
                        break;
                    case 'error':
                        this.onErrorCallback(message.data);
                        break;
                    case 'ping':
                        this.sendPong();
                        break;
                    case 'pong':
                        console.log('Received pong from server');
                        break;
                    default:
                        console.warn('Unknown message type:', message.event);
                }
            } catch (error) {
                console.error('Error parsing message:', error);
                this.onErrorCallback('Invalid message format');
            }
        };

        this.ws.onclose = () => {
            this.isConnected = false;
            console.log('Signaling connection closed');
            this.cleanupTimers();
            this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('Signaling error:', error);
            this.onErrorCallback('Connection error');
        };
    }

    private async flushMessageQueue() {
        while (this.messageQueue.length > 0 && this.isConnected) {
            const message = this.messageQueue.shift();
            if (message) {
                await this.sendMessageInternal(message);
            }
        }
    }

    private async sendMessageInternal(message: { event: string; data: any }): Promise<void> {
        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('Error sending message:', error);
            this.messageQueue.unshift(message);
            throw error;
        }
    }

    private cleanupTimers() {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    private attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            this.connectionPromise = new Promise((resolve) => {
                this.resolveConnection = resolve;
            });

            setTimeout(() => {
                this.ws = new WebSocket(this.ws.url);
                this.setupEventListeners();
            }, this.reconnectDelay);
        } else {
            this.onErrorCallback('Failed to reconnect to signaling server');
        }
    }

    async sendMessage(message: { event: string; data: any }): Promise<void> {
        if (!this.isConnected) {
            console.log('WebSocket not connected, adding message to queue');
            this.messageQueue.push(message);
            await this.connectionPromise;
            return this.sendMessage(message);
        }

        return this.sendMessageInternal(message);
    }

    async createRoom(username: string): Promise<void> {
        return this.sendMessage({
            event: 'join',
            data: {
                roomId: '',
                username
            }
        });
    }

    async joinRoom(roomId: string, username: string): Promise<void> {
        return this.sendMessage({
            event: 'join',
            data: {
                roomId,
                username
            }
        });
    }

    async sendOffer(data: { offer: RTCSessionDescriptionInit; to: string }): Promise<void> {
        return this.sendMessage({
            event: 'offer',
            data: {
                offer: data.offer,
                to: data.to
            }
        });
    }

    async sendAnswer(data: { answer: RTCSessionDescriptionInit; to: string }): Promise<void> {
        return this.sendMessage({
            event: 'answer',
            data: {
                answer: data.answer,
                to: data.to
            }
        });
    }

    async sendCandidate(data: { candidate: RTCIceCandidateInit; to: string }): Promise<void> {
        return this.sendMessage({
            event: 'candidate',
            data: {
                candidate: data.candidate,
                to: data.to
            }
        });
    }

    onOffer(callback: (data: { offer: RTCSessionDescriptionInit; from: string }) => void): void {
        this.onOfferCallback = callback;
    }

    onAnswer(callback: (data: { answer: RTCSessionDescriptionInit; from: string }) => void): void {
        this.onAnswerCallback = callback;
    }

    onCandidate(callback: (data: { candidate: RTCIceCandidateInit; from: string }) => void): void {
        this.onCandidateCallback = callback;
    }

    onRoomCreated(callback: (data: { roomId: string; clients: string[] }) => void): void {
        this.onRoomCreatedCallback = callback;
    }

    onUserJoined(callback: (username: string) => void): void {
        this.onUserJoinedCallback = callback;
    }

    onUserLeft(callback: (username: string) => void): void {
        this.onUserLeftCallback = callback;
    }

    onError(callback: (error: string) => void): void {
        this.onErrorCallback = callback;
    }

    private sendPing(): void {
        this.sendMessage({ event: 'ping', data: null }).catch(console.error);
    }

    private sendPong(): void {
        this.sendMessage({ event: 'pong', data: null }).catch(console.error);
    }

    close(): void {
        this.cleanupTimers();
        this.ws.close();
    }
}