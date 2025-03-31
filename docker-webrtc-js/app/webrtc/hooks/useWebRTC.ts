// app\webrtc\hooks\useWebRTC.ts
import { useEffect, useRef, useState } from 'react';
import { SignalingClient } from '../lib/signaling';

interface User {
    username: string;
    stream?: MediaStream;
}

export const useWebRTC = (deviceIds: { video: string; audio: string }, username: string) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteUsers, setRemoteUsers] = useState<User[]>([]);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [isCaller, setIsCaller] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [error, setError] = useState<string | null>(null);

    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const signalingClient = useRef<SignalingClient | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    const initPeerConnection = (userId: string) => {
        try {
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
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

            pc.oniceconnectionstatechange = () => {
                setConnectionStatus(pc.iceConnectionState);
                if (pc.iceConnectionState === 'failed') {
                    pc.restartIce();
                }
            };

            pc.ontrack = (event) => {
                setRemoteUsers(prev => {
                    const existingUser = prev.find(u => u.username === userId);
                    if (existingUser) {
                        if (!existingUser.stream) {
                            existingUser.stream = new MediaStream();
                        }
                        event.streams[0].getTracks().forEach(track => {
                            existingUser.stream?.addTrack(track);
                        });
                        return [...prev];
                    }
                    return [...prev, { username: userId, stream: event.streams[0] }];
                });
            };

            peerConnections.current[userId] = pc;
            return pc;
        } catch (err) {
            console.error('Error initializing peer connection:', err);
            return null;
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

    const createOffer = async (toUsername: string) => {
        const pc = initPeerConnection(toUsername);
        if (!pc || !localStreamRef.current) return;

        localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        signalingClient.current?.sendOffer({
            offer,
            to: toUsername
        });
    };

    const startCall = async (isInitiator: boolean, existingRoomId?: string) => {
        try {
            setIsCaller(isInitiator);
            const stream = await getLocalMedia();

            signalingClient.current = new SignalingClient('wss://anybet.site/ws');

            signalingClient.current.onRoomCreated((data) => {
                setRoomId(data.roomId);
                if (isInitiator && !existingRoomId) {
                    data.clients.forEach((clientUsername: string) => {
                        createOffer(clientUsername);
                    });
                }
            });

            signalingClient.current.onUserJoined((username) => {
                if (isCaller) {
                    createOffer(username);
                }
                setRemoteUsers(prev => [...prev, { username }]);
            });

            signalingClient.current.onUserLeft((username) => {
                setRemoteUsers(prev => prev.filter(u => u.username !== username));
                if (peerConnections.current[username]) {
                    peerConnections.current[username].close();
                    delete peerConnections.current[username];
                }
            });

            signalingClient.current.onOffer(async ({ offer, from }) => {
                const pc = initPeerConnection(from);
                if (!pc) return;

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
            });

            signalingClient.current.onAnswer(async ({ answer, from }) => {
                const pc = peerConnections.current[from];
                if (pc) {
                    await pc.setRemoteDescription(answer);
                }
            });

            signalingClient.current.onCandidate(async ({ candidate, from }) => {
                const pc = peerConnections.current[from];
                if (pc && candidate) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
            });

            signalingClient.current.onError((error) => {
                setError(error);
            });

            if (existingRoomId) {
                signalingClient.current.joinRoom(existingRoomId, username);
            } else {
                signalingClient.current.createRoom(username);
            }

        } catch (err) {
            console.error('Error starting call:', err);
            setError('Failed to start call');
            cleanup();
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
        stopCall
    };
};