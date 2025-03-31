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
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const processedUsers = useRef<Set<string>>(new Set());

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
                const newStream = new MediaStream();
                event.streams[0].getTracks().forEach(track => {
                    newStream.addTrack(track);
                });

                if (existingUser) {
                    return prev.map(u =>
                        u.username === userId ? { ...u, stream: newStream } : u
                    );
                }
                return [...prev, {
                    username: userId,
                    stream: newStream,
                    peerConnection: pc
                }];
            });
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'connected') {
                setConnectionStatus('connected');
            } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                setConnectionStatus('disconnected');
            }
        };

        peerConnections.current[userId] = pc;
        return pc;
    };

    const createOffer = async (toUsername: string) => {
        if (peerConnections.current[toUsername]) {
            console.log('Connection already exists for user:', toUsername);
            return;
        }

        const pc = initPeerConnection(toUsername);
        if (!localStreamRef.current) return;

        try {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });

            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
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
            processedUsers.current = new Set();
            setIsCaller(isInitiator);
            await getLocalMedia();

            signalingClient.current = new SignalingClient('wss://anybet.site/ws');

            signalingClient.current.onRoomCreated = (data: RoomCreatedData) => {
                setRoomId(data.roomId);
                setConnectionStatus('connecting');

                if (isInitiator) {
                    data.clients.forEach((clientUsername: string) => {
                        if (clientUsername !== username && !processedUsers.current.has(clientUsername)) {
                            processedUsers.current.add(clientUsername);
                            createOffer(clientUsername);
                        }
                    });
                }
            };

            signalingClient.current.onUserJoined = (joinedUsername: string) => {
                if (joinedUsername === username || processedUsers.current.has(joinedUsername)) return;

                processedUsers.current.add(joinedUsername);
                setConnectionStatus('connecting');

                if (isCaller) {
                    createOffer(joinedUsername);
                }

                setRemoteUsers(prev => {
                    const existingUser = prev.find(u => u.username === joinedUsername);
                    return existingUser ? prev : [...prev, { username: joinedUsername }];
                });
            };

            signalingClient.current.onUserLeft = (leftUsername: string) => {
                setRemoteUsers(prev => {
                    const user = prev.find(u => u.username === leftUsername);
                    if (user?.peerConnection) {
                        user.peerConnection.close();
                        delete peerConnections.current[leftUsername];
                    }
                    processedUsers.current.delete(leftUsername);
                    return prev.filter(u => u.username !== leftUsername);
                });
            };

            signalingClient.current.onOffer = async ({ offer, from }: WebRTCOffer) => {
                if (processedUsers.current.has(from)) return;
                processedUsers.current.add(from);

                const pc = initPeerConnection(from);
                await pc.setRemoteDescription(new RTCSessionDescription(offer));

                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(track => {
                        pc.addTrack(track, localStreamRef.current!);
                    });
                }

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                signalingClient.current?.sendAnswer({
                    answer,
                    to: from
                });

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
                const pc = peerConnections.current[from];
                if (pc) {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                }
            };

            signalingClient.current.onCandidate = async ({ candidate, from }: WebRTCCandidate) => {
                const pc = peerConnections.current[from];
                if (pc && candidate) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (err) {
                        console.error('Error adding ICE candidate:', err);
                    }
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
            setLocalStream(new MediaStream(stream.getTracks()));
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
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        processedUsers.current.clear();

        if (signalingClient.current) {
            signalingClient.current.close();
            signalingClient.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
            setLocalStream(null);
        }

        setRemoteUsers([]);
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