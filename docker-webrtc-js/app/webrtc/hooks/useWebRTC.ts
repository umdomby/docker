import { useEffect, useRef, useState } from 'react';
import { SignalingClient } from '../lib/signaling';

export const useWebRTC = (deviceIds: { video: string; audio: string }) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [isCaller, setIsCaller] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [error, setError] = useState<string | null>(null);

    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const signalingClient = useRef<SignalingClient | null>(null);
    const remoteStreamRef = useRef<MediaStream>(new MediaStream());
    const localStreamRef = useRef<MediaStream | null>(null);

    const initPeerConnection = () => {
        try {
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });

            pc.onicecandidate = (event) => {
                if (event.candidate && signalingClient.current) {
                    signalingClient.current.sendCandidate(event.candidate.toJSON());
                }
            };

            pc.oniceconnectionstatechange = () => {
                setConnectionStatus(pc.iceConnectionState);
                if (pc.iceConnectionState === 'failed') {
                    pc.restartIce();
                }
            };

            pc.ontrack = (event) => {
                if (!event.streams || event.streams.length === 0) return;
                event.streams[0].getTracks().forEach(track => {
                    remoteStreamRef.current.addTrack(track);
                });
                setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
            };

            peerConnection.current = pc;
            return pc;
        } catch (err) {
            console.error('Error initializing peer connection:', err);
            setError('Failed to initialize connection');
            throw err;
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

    const startCall = async (isInitiator: boolean, existingRoomId?: string) => {
        try {
            setIsCaller(isInitiator);
            const pc = initPeerConnection();
            const stream = await getLocalMedia();

            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            signalingClient.current = new SignalingClient('wss://anybet.site/ws');

            signalingClient.current.onRoomCreated((id) => {
                setRoomId(id);
                if (isInitiator && !existingRoomId) {
                    pc.createOffer()
                        .then(offer => pc.setLocalDescription(offer))
                        .then(() => {
                            signalingClient.current?.sendOffer(pc.localDescription!);
                        });
                }
            });

            signalingClient.current.onOffer(async (offer) => {
                if (!peerConnection.current) return;
                await pc.setRemoteDescription(offer);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                signalingClient.current?.sendAnswer(answer);
            });

            signalingClient.current.onAnswer(async (answer) => {
                if (peerConnection.current) {
                    await pc.setRemoteDescription(answer);
                }
            });

            signalingClient.current.onCandidate(async (candidate) => {
                if (peerConnection.current && candidate) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
            });

            signalingClient.current.onError((error) => {
                setError(error);
            });

            if (existingRoomId) {
                signalingClient.current.joinRoom(existingRoomId);
            } else {
                signalingClient.current.createRoom();
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
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }

        if (signalingClient.current) {
            signalingClient.current.close();
            signalingClient.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
            setLocalStream(null);
        }

        remoteStreamRef.current.getTracks().forEach(track => track.stop());
        remoteStreamRef.current = new MediaStream();
        setRemoteStream(null);
    };

    useEffect(() => {
        return cleanup;
    }, []);

    return {
        localStream,
        remoteStream,
        roomId,
        connectionStatus,
        error,
        isConnected: connectionStatus === 'connected',
        startCall,
        joinRoom,
        stopCall
    };
};