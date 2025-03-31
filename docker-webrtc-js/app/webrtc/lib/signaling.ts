//signaling.ts
export class SignalingClient {
    private ws: WebSocket;
    private onOfferCallback: (offer: RTCSessionDescriptionInit) => void = () => {};
    private onAnswerCallback: (answer: RTCSessionDescriptionInit) => void = () => {};
    private onCandidateCallback: (candidate: RTCIceCandidateInit) => void = () => {};
    private onRoomCreatedCallback: (roomId: string) => void = () => {};
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectInterval = 1000;

    constructor(url: string) {
        if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
            throw new Error('Invalid WebSocket URL protocol');
        }
        this.ws = new WebSocket(url);
        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.ws.onopen = () => {
            console.log('Signaling connection established');
            this.reconnectAttempts = 0; // Сброс счетчика переподключений
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
                        this.onOfferCallback(message.data as RTCSessionDescriptionInit);
                        break;
                    case 'answer':
                        this.onAnswerCallback(message.data as RTCSessionDescriptionInit);
                        break;
                    case 'candidate':
                        this.onCandidateCallback(message.data as RTCIceCandidateInit);
                        break;
                    case 'ping':
                        this.sendPong();
                        break;
                    default:
                        console.warn('Unknown message type:', message.event);
                }
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        this.ws.onclose = (event) => {
            console.log(`Signaling connection closed: ${event.code} ${event.reason}`);
            this.handleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('Signaling error:', error);
            console.error('WebSocket state:', this.ws.readyState);
        };

        // Периодическая проверка соединения
        setInterval(() => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.sendMessage({ event: 'ping', data: null });
            }
        }, 30000);
    }

    private sendPong() {
        this.sendMessage({ event: 'pong', data: null });
    }

    private handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                this.reconnectAttempts++;
                console.log(`Reconnecting attempt ${this.reconnectAttempts}...`);
                this.ws = new WebSocket(this.ws.url);
                this.setupEventListeners();
            }, this.reconnectInterval * this.reconnectAttempts);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    createRoom(): void {
        this.sendMessage({ event: 'join', data: '' });
    }

    joinRoom(roomId: string): void {
        this.sendMessage({ event: 'join', data: roomId });
    }

    sendOffer(offer: RTCSessionDescriptionInit): void {
        this.sendMessage({ event: 'offer', data: offer });
    }

    sendAnswer(answer: RTCSessionDescriptionInit): void {
        this.sendMessage({ event: 'answer', data: answer });
    }

    sendCandidate(candidate: RTCIceCandidateInit): void {
        this.sendMessage({ event: 'candidate', data: candidate });
    }

    onOffer(callback: (offer: RTCSessionDescriptionInit) => void): void {
        this.onOfferCallback = callback;
    }

    onAnswer(callback: (answer: RTCSessionDescriptionInit) => void): void {
        this.onAnswerCallback = callback;
    }

    onCandidate(callback: (candidate: RTCIceCandidateInit) => void): void {
        this.onCandidateCallback = callback;
    }

    onRoomCreated(callback: (roomId: string) => void): void {
        this.onRoomCreatedCallback = callback;
    }

    private sendMessage(message: { event: string; data: any }): void {
        if (this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(message));
            } catch (error) {
                console.error('Error sending message:', error);
            }
        } else {
            console.error('WebSocket is not open. ReadyState:', this.ws.readyState);
            // Можно добавить в очередь сообщений для отправки после подключения
        }
    }

    close(): void {
        this.ws.close();
    }

    get readyState(): number {
        return this.ws.readyState;
    }
}