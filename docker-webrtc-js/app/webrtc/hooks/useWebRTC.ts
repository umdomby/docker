// file: docker-webrtc-js/app/webrtc/hooks/useWebRTC.ts
import { useEffect, useRef, useState } from 'react';
import { SignalingClient } from '../lib/signaling';

interface User {
    username: string;
    stream?: MediaStream;
    peerConnection?: RTCPeerConnection;
}

export const useWebRTC = (deviceIds: { video: string; audio: string }, username: string) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteUsers, setRemoteUsers] = useState<User[]>([]);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [isCaller, setIsCaller] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [error, setError] = useState<string | null>(null);

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

    const initPeerConnection = (userId: string): RTCPeerConnection => {
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
                    stream: event.streams[0],
                    peerConnection: pc
                }];
            });
        };

        return pc;
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
        if (!localStreamRef.current) return;

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

            setRemoteUsers(prev => {
                const existingUser = prev.find(u => u.username === toUsername);
                if (existingUser) {
                    existingUser.peerConnection = pc;
                    return [...prev];
                }
                return [...prev, {
                    username: toUsername,
                    peerConnection: pc
                }];
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

            signalingClient.current = new SignalingClient('wss://anybet.site/ws');

            signalingClient.current.onRoomCreated((data) => {
                setRoomId(data.roomId);
                setConnectionStatus('connecting');
                if (isInitiator && !existingRoomId) {
                    data.clients.forEach((clientUsername: string) => {
                        if (clientUsername !== username) {
                            createOffer(clientUsername);
                        }
                    });
                }
            });

            signalingClient.current.onUserJoined((joinedUsername) => {
                if (joinedUsername === username) return;

                setConnectionStatus('connecting');
                if (isCaller) {
                    createOffer(joinedUsername);
                }
                setRemoteUsers(prev => {
                    if (!prev.some(u => u.username === joinedUsername)) {
                        return [...prev, { username: joinedUsername }];
                    }
                    return prev;
                });
            });

            signalingClient.current.onUserLeft((leftUsername) => {
                setRemoteUsers(prev => {
                    const user = prev.find(u => u.username === leftUsername);
                    if (user?.peerConnection) {
                        user.peerConnection.close();
                    }
                    return prev.filter(u => u.username !== leftUsername);
                });
            });

            signalingClient.current.onOffer(async ({ offer, from }) => {
                if (from === username) return;

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
                        existingUser.peerConnection = pc;
                        return [...prev];
                    }
                    return [...prev, {
                        username: from,
                        peerConnection: pc
                    }];
                });
            });

            signalingClient.current.onAnswer(async ({ answer, from }) => {
                const user = remoteUsers.find(u => u.username === from);
                if (user?.peerConnection) {
                    await user.peerConnection.setRemoteDescription(answer);
                }
            });

            signalingClient.current.onCandidate(async ({ candidate, from }) => {
                const user = remoteUsers.find(u => u.username === from);
                if (user?.peerConnection && candidate) {
                    await user.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                }
            });

            signalingClient.current.onError((error) => {
                setError(error);
                setConnectionStatus('failed');
            });

            if (existingRoomId) {
                signalingClient.current.joinRoom(existingRoomId, username);
            } else {
                signalingClient.current.createRoom(username);
            }

        } catch (err) {
            console.error('Error starting call:', err);
            setError(`Failed to start call: ${err instanceof Error ? err.message : String(err)}`);
            setConnectionStatus('failed');
            cleanup();
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
        stopCall
    };
};