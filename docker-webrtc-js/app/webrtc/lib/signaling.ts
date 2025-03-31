export class SignalingClient {
    private ws: WebSocket;
    private onOfferCallback: (offer: RTCSessionDescriptionInit) => void = () => {};
    private onAnswerCallback: (answer: RTCSessionDescriptionInit) => void = () => {};
    private onCandidateCallback: (candidate: RTCIceCandidateInit) => void = () => {};
    private onRoomCreatedCallback: (roomId: string) => void = () => {};
    private onErrorCallback: (error: string) => void = () => {};
    private messageQueue: Array<{event: string, data: any}> = [];
    private isConnected = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    constructor(url: string) {
        this.ws = new WebSocket(url);
        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.ws.onopen = () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log('Signaling connection established');
            this.messageQueue.forEach(msg => this.sendMessage(msg));
            this.messageQueue = [];
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
                    case 'error':
                        this.onErrorCallback(message.data);
                        break;
                    case 'ping':
                        this.sendPong();
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
            this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('Signaling error:', error);
            this.onErrorCallback('Connection error');
        };
    }

    private attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => {
                this.ws = new WebSocket(this.ws.url);
                this.setupEventListeners();
            }, this.reconnectDelay);
        } else {
            this.onErrorCallback('Failed to reconnect to signaling server');
        }
    }

    private sendPong() {
        this.sendMessage({ event: 'pong', data: null });
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

    onError(callback: (error: string) => void): void {
        this.onErrorCallback = callback;
    }

    private sendMessage(message: { event: string; data: any }): void {
        const messageString = JSON.stringify(message);

        if (this.isConnected) {
            try {
                this.ws.send(messageString);
            } catch (error) {
                console.error('Error sending message:', error);
                this.messageQueue.push(message);
            }
        } else {
            console.log('WebSocket not connected, adding message to queue');
            this.messageQueue.push(message);
        }
    }

    close(): void {
        this.ws.close();
    }
}