// app/webrtc/hooks/useMediaDevices.ts
'use client';

import { useState, useEffect } from 'react';

export const useMediaDevices = () => {
    const [isSupported, setIsSupported] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const checkSupport = () => {
            const supported = typeof window !== 'undefined' &&
                !!navigator.mediaDevices?.getUserMedia;
            setIsSupported(supported);
            return supported;
        };

        if (checkSupport()) {
            navigator.mediaDevices.enumerateDevices()
                .then(devices => {
                    const videoPerm = devices.some(d => d.kind === 'videoinput' && d.label);
                    const audioPerm = devices.some(d => d.kind === 'audioinput' && d.label);
                    setHasPermission(videoPerm && audioPerm);
                })
                .catch(setError);
        }
    }, []);

    return { isSupported, hasPermission, error };
};