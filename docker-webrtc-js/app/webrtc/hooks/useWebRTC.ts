// file: docker-webrtc-js/app/webrtc/hooks/useWebRTC.ts
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

    const checkPermissions = async () => {
        try {
            const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
            const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });

            if (cameraPermission.state !== 'granted' || microphonePermission.state !== 'granted') {
                console.warn('Camera or microphone permission not granted');
                setError('Please grant access to camera and microphone');
                return false;
            }
            return true;
        } catch (err) {
            console.error('Error checking permissions:', err);
            setError('Failed to check permissions');
            return false;
        }
    };

    const initPeerConnection = (userId: string): RTCPeerConnection | null => {
        try {
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' }
                ],
                iceCandidatePoolSize: 10,
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require'
            });

            pc.onicecandidate = (event) => {
                if (event.candidate && signalingClient.current) {
                    console.log('Sending ICE candidate:', event.candidate);
                    signalingClient.current.sendCandidate({
                        candidate: event.candidate,
                        to: userId
                    });
                } else if (!event.candidate) {
                    console.log('All ICE candidates have been sent');
                }
            };

            pc.oniceconnectionstatechange = () => {
                console.log(`ICE connection state changed to: ${pc.iceConnectionState}`);
                setConnectionStatus(pc.iceConnectionState);
                if (pc.iceConnectionState === 'failed') {
                    console.log('Restarting ICE...');
                    pc.restartIce();
                }
            };

            pc.ontrack = (event) => {
                console.log('Received remote track:', event.track.kind);
                setRemoteUsers(prev => {
                    const existingUser = prev.find(u => u.username === userId);
                    if (existingUser) {
                        if (!existingUser.stream) {
                            existingUser.stream = new MediaStream();
                        }
                        event.streams[0].getTracks().forEach(track => {
                            if (!existingUser.stream!.getTracks().some(t => t.id === track.id)) {
                                existingUser.stream!.addTrack(track);
                            }
                        });
                        return [...prev];
                    }
                    return [...prev, {
                        username: userId,
                        stream: event.streams[0]
                    }];
                });
            };

            pc.onnegotiationneeded = async () => {
                console.log('Negotiation needed for:', userId);
                try {
                    const offer = await pc.createOffer({
                        offerToReceiveAudio: true,
                        offerToReceiveVideo: true
                    });
                    await pc.setLocalDescription(offer);
                    signalingClient.current?.sendOffer({
                        offer,
                        to: userId
                    });
                } catch (err) {
                    console.error('Negotiation error:', err);
                    setError('Failed to negotiate connection');
                }
            };

            peerConnections.current[userId] = pc;
            return pc;
        } catch (err) {
            console.error('Error initializing peer connection:', err);
            setError('Failed to initialize connection');
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
        console.log('Creating offer for:', toUsername);
        const pc = initPeerConnection(toUsername);
        if (!pc || !localStreamRef.current) return;

        localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
        });

        try {
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await pc.setLocalDescription(offer);
            signalingClient.current?.sendOffer({
                offer,
                to: toUsername
            });
        } catch (err) {
            console.error('Error creating offer:', err);
            setError('Failed to create offer');
        }
    };

    const startCall = async (isInitiator: boolean, existingRoomId?: string) => {
        try {
            const permissionsGranted = await checkPermissions();
            if (!permissionsGranted) return;

            setIsCaller(isInitiator);
            await getLocalMedia();

            // const isProduction = process.env.NODE_ENV === 'production';
            // const wsUrl = isProduction
            //     ? 'wss://anybet.site/ws'
            //     : 'ws://localhost:8080';
            // signalingClient.current = new SignalingClient(wsUrl);

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