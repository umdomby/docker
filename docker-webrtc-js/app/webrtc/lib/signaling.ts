// app/webrtc/lib/signaling.ts
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

    constructor(url: string) {
        this.ws = new WebSocket(url);
        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.ws.onopen = () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log('Signaling connection established');
            this.sendPing();
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
                        this.sendPong(); // Отправляем pong в ответ на ping
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
            this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('Signaling error:', error);
            this.onErrorCallback('Connection error');
        };
    }

    createRoom(username: string): void {
        this.sendMessage({
            event: 'join',
            data: {
                roomId: '',
                username
            }
        });
    }

    joinRoom(roomId: string, username: string): void {
        this.sendMessage({
            event: 'join',
            data: {
                roomId,
                username
            }
        });
    }

    sendOffer(data: { offer: RTCSessionDescriptionInit; to: string }): void {
        this.sendMessage({
            event: 'offer',
            data: {
                offer: data.offer,
                to: data.to
            }
        });
    }

    sendAnswer(data: { answer: RTCSessionDescriptionInit; to: string }): void {
        this.sendMessage({
            event: 'answer',
            data: {
                answer: data.answer,
                to: data.to
            }
        });
    }

    sendCandidate(data: { candidate: RTCIceCandidateInit; to: string }): void {
        this.sendMessage({
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
        this.sendMessage({ event: 'ping', data: null });
    }

    private sendPong(): void {
        this.sendMessage({ event: 'pong', data: null });
    }

    private attemptReconnect(): void {
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