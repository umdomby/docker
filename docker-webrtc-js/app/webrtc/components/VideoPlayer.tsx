// app/webrtc/components/VideoPlayer.tsx
import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
    stream: MediaStream | null;
    muted?: boolean;
    className?: string;
}

export const VideoPlayer = ({ stream, muted = false, className }: VideoPlayerProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (stream) {
            video.srcObject = stream;
            video.play().catch(err => console.error('Error playing video:', err));
        } else {
            video.srcObject = null;
        }

        return () => {
            video.srcObject = null;
        };
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