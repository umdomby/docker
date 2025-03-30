'use client';

import { useState, useCallback } from 'react';

export const useVideoStream = () => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const startStream = useCallback(async (constraints: MediaStreamConstraints) => {
        try {
            setError(null);
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(newStream);
            return newStream;
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Media stream error'));
            throw err;
        }
    }, []);

    const stopStream = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    return {
        stream,
        error,
        startStream,
        stopStream,
        isActive: !!stream
    };
};