// components/VideoPlayer.tsx
import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
    stream: MediaStream | null;
    muted?: boolean;
    className?: string;
}

export const VideoPlayer = ({ stream, muted = false, className }: VideoPlayerProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            className={className}
        />
    );
};