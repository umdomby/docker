'use client';

import { useState } from 'react';

interface CallControlsProps {
    onMuteToggle: () => void;
    onVideoToggle: () => void;
}

export default function CallControls({ onMuteToggle, onVideoToggle }: CallControlsProps) {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const handleMuteToggle = () => {
        setIsMuted(!isMuted);
        onMuteToggle();
    };

    const handleVideoToggle = () => {
        setIsVideoOff(!isVideoOff);
        onVideoToggle();
    };

    return (
        <div className="controls">
            <button onClick={handleMuteToggle}>
                {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button onClick={handleVideoToggle}>
                {isVideoOff ? 'Video On' : 'Video Off'}
            </button>
        </div>
    );
}