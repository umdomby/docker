// app/webrtc/hooks/useWebRTC.ts
import { useEffect, useRef, useState } from 'react';
import { SignalingClient } from '../lib/signaling';
import { User, RoomCreatedData, WebRTCOffer, WebRTCAnswer, WebRTCCandidate } from '../types';

export const useWebRTC = (deviceIds: { video: string; audio: string }, username: string) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteUsers, setRemoteUsers] = useState<User[]>([]);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [isCaller, setIsCaller] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [error, setError] = useState<string | null>(null);

    const signalingClient = useRef<SignalingClient | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    const initPeerConnection = (userId: string): RTCPeerConnection => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                {
                    urls: 'turn:turn.bistri.com:80',
                    username: 'homeo',
                    credential: 'homeo'
                }
            ]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate && signalingClient.current) {
                signalingClient.current.sendCandidate({
                    candidate: event.candidate,
                    to: userId
                });
            }
        };

        pc.ontrack = (event) => {
            setRemoteUsers(prev => {
                const existingUser = prev.find(u => u.username === userId);
                if (existingUser) {
                    const newStream = existingUser.stream || new MediaStream();
                    event.streams[0].getTracks().forEach(track => {
                        if (!newStream.getTracks().some(t => t.id === track.id)) {
                            newStream.addTrack(track);
                        }
                    });
                    return prev.map(u =>
                        u.username === userId ? { ...u, stream: newStream } : u
                    );
                }
                return [...prev, {
                    username: userId,
                    stream: event.streams[0],
                    peerConnection: pc
                }];
            });
        };

        return pc;
    };

    const createOffer = async (toUsername: string) => {
        const pc = initPeerConnection(toUsername);
        if (!localStreamRef.current) return;

        localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
        });

        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            signalingClient.current?.sendOffer({
                offer,
                to: toUsername
            });

            setRemoteUsers(prev => {
                const existingUser = prev.find(u => u.username === toUsername);
                if (existingUser) {
                    return prev.map(u =>
                        u.username === toUsername ? { ...u, peerConnection: pc } : u
                    );
                }
                return [...prev, { username: toUsername, peerConnection: pc }];
            });
        } catch (err) {
            console.error('Error creating offer:', err);
            setError('Failed to create offer');
        }
    };

    const startCall = async (isInitiator: boolean, existingRoomId?: string) => {
        try {
            setIsCaller(isInitiator);
            await getLocalMedia();

            signalingClient.current = new SignalingClient('wss://anybet.site/ws');

            signalingClient.current.onRoomCreated = (data: RoomCreatedData) => {
                setRoomId(data.roomId);
                setConnectionStatus('connecting');
                if (isInitiator) {
                    data.clients.forEach((clientUsername: string) => {
                        if (clientUsername !== username) {
                            createOffer(clientUsername);
                        }
                    });
                }
            };

            signalingClient.current.onUserJoined = (joinedUsername: string) => {
                if (joinedUsername === username) return;
                setConnectionStatus('connecting');
                if (isCaller) {
                    createOffer(joinedUsername);
                }
                setRemoteUsers(prev => [...prev, { username: joinedUsername }]);
            };

            signalingClient.current.onUserLeft = (leftUsername: string) => {
                setRemoteUsers(prev => {
                    const user = prev.find(u => u.username === leftUsername);
                    user?.peerConnection?.close();
                    return prev.filter(u => u.username !== leftUsername);
                });
            };

            signalingClient.current.onOffer = async ({ offer, from }: WebRTCOffer) => {
                const pc = initPeerConnection(from);
                await pc.setRemoteDescription(offer);

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                signalingClient.current?.sendAnswer({
                    answer,
                    to: from
                });

                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(track => {
                        pc.addTrack(track, localStreamRef.current!);
                    });
                }

                setRemoteUsers(prev => {
                    const existingUser = prev.find(u => u.username === from);
                    if (existingUser) {
                        return prev.map(u =>
                            u.username === from ? { ...u, peerConnection: pc } : u
                        );
                    }
                    return [...prev, { username: from, peerConnection: pc }];
                });
            };

            signalingClient.current.onAnswer = async ({ answer, from }: WebRTCAnswer) => {
                const user = remoteUsers.find(u => u.username === from);
                if (user?.peerConnection) {
                    await user.peerConnection.setRemoteDescription(answer);
                }
            };

            signalingClient.current.onCandidate = async ({ candidate, from }: WebRTCCandidate) => {
                const user = remoteUsers.find(u => u.username === from);
                if (user?.peerConnection && candidate) {
                    await user.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                }
            };

            signalingClient.current.onError = (error: string) => {
                setError(error);
                setConnectionStatus('failed');
            };

            if (existingRoomId) {
                await signalingClient.current.joinRoom(existingRoomId, username);
            } else {
                await signalingClient.current.createRoom(username);
            }

        } catch (error) {
            console.error('Error starting call:', error);
            setError(`Failed to start call: ${error instanceof Error ? error.message : String(error)}`);
            setConnectionStatus('failed');
            cleanup();
        }
    };

    const getLocalMedia = async () => {
        try {
            const constraints = {
                video: deviceIds.video ? { deviceId: { exact: deviceIds.video } } : true,
                audio: deviceIds.audio ? { deviceId: { exact: deviceIds.audio } } : true
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStreamRef.current = stream;
            setLocalStream(stream);
            return stream;
        } catch (err) {
            console.error('Error getting media devices:', err);
            setError('Could not access camera/microphone');
            throw err;
        }
    };

    const joinRoom = (roomId: string) => {
        startCall(false, roomId);
    };

    const stopCall = () => {
        cleanup();
        setRoomId(null);
        setConnectionStatus('disconnected');
    };

    const cleanup = () => {
        setRemoteUsers(prev => {
            prev.forEach(user => {
                if (user.peerConnection) {
                    user.peerConnection.close();
                }
            });
            return [];
        });

        if (signalingClient.current) {
            signalingClient.current.close();
            signalingClient.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
            setLocalStream(null);
        }
    };

    useEffect(() => {
        return () => {
            cleanup();
        };
    }, []);

    return {
        localStream,
        remoteUsers,
        roomId,
        connectionStatus,
        error,
        isConnected: connectionStatus === 'connected',
        startCall,
        joinRoom,
        stopCall,
        signalingClient
    };
};