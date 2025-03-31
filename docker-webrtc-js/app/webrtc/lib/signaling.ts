export class SignalingClient {
    private ws: WebSocket;
    private onOfferCallback: (offer: RTCSessionDescriptionInit) => void = () => {};
    private onAnswerCallback: (answer: RTCSessionDescriptionInit) => void = () => {};
    private onCandidateCallback: (candidate: RTCIceCandidateInit) => void = () => {};
    private onRoomCreatedCallback: (roomId: string) => void = () => {};
    private messageQueue: Array<{event: string, data: any}> = [];
    private isConnected = false;

    constructor(url: string) {
        this.ws = new WebSocket(url);
        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.ws.onopen = () => {
            this.isConnected = true;
            console.log('Signaling connection established');
            // Отправляем все сообщения из очереди
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

        this.ws.onclose = () => {
            this.isConnected = false;
            console.log('Signaling connection closed');
        };

        this.ws.onerror = (error) => {
            console.error('Signaling error:', error);
        };
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

    private sendMessage(message: { event: string; data: any }): void {
        if (this.isConnected) {
            try {
                this.ws.send(JSON.stringify(message));
            } catch (error) {
                console.error('Error sending message:', error);
                // Добавляем сообщение в очередь для повторной отправки
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