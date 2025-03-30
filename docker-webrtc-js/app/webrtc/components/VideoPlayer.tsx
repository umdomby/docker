'use client';

import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
    stream: MediaStream | null;
    isMuted: boolean;
    label?: string;
    className?: string;
}

export default function VideoPlayer({
                                        stream,
                                        isMuted,
                                        label = '',
                                        className = ''
                                    }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;

        return () => {
            if (video.srcObject) {
                (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    return (
        <div className={className}>
            {label && <div className="video-label">{label}</div>}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                className="w-full h-auto bg-black rounded-lg"
            />
        </div>
    );
}