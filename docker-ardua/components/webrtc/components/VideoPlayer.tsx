import { useEffect, useRef, useState } from 'react'

interface VideoPlayerProps {
    stream: MediaStream | null;
    muted?: boolean;
    className?: string;
    transform?: string;
    videoRef?: React.RefObject<HTMLVideoElement | null>;
}

type VideoSettings = {
    rotation: number;
    flipH: boolean;
    flipV: boolean;
};

export const VideoPlayer = ({ stream, muted = false, className, transform, videoRef }: VideoPlayerProps) => {
    const internalVideoRef = useRef<HTMLVideoElement>(null)
    const [computedTransform, setComputedTransform] = useState<string>('')
    const [isRotated, setIsRotated] = useState(false)

    // Use the provided ref or the internal one
    const actualVideoRef = videoRef || internalVideoRef

    useEffect(() => {
        // Apply transformations and detect rotation
        if (typeof transform === 'string') {
            setComputedTransform(transform)
            // Check if transform includes 90 or 270 degree rotation
            setIsRotated(transform.includes('rotate(90deg') || transform.includes('rotate(270deg)'))
        } else {
            try {
                const saved = localStorage.getItem('videoSettings')
                if (saved) {
                    const { rotation, flipH, flipV } = JSON.parse(saved) as VideoSettings
                    let fallbackTransform = ''
                    if (rotation !== 0) fallbackTransform += `rotate(${rotation}deg) `
                    fallbackTransform += `scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`
                    setComputedTransform(fallbackTransform)
                    setIsRotated(rotation === 90 || rotation === 270)
                } else {
                    setComputedTransform('')
                    setIsRotated(false)
                }
            } catch (e) {
                console.error('Error parsing saved video settings:', e)
                setComputedTransform('')
                setIsRotated(false)
            }
        }
    }, [transform])

    useEffect(() => {
        const video = actualVideoRef.current
        if (!video) return

        const handleCanPlay = () => {
            video.play().catch(e => {
                console.error('Playback failed:', e)
                video.muted = true
                video.play().catch(e => console.error('Muted playback also failed:', e))
            })
        }

        video.addEventListener('canplay', handleCanPlay)

        if (stream) {
            video.srcObject = stream
        } else {
            video.srcObject = null
        }

        return () => {
            video.removeEventListener('canplay', handleCanPlay)
            video.srcObject = null
        }
    }, [stream, actualVideoRef])

    return (
        <video
            ref={actualVideoRef}
            autoPlay
            playsInline
            muted={muted}
            className={`${className} ${isRotated ? 'rotated' : ''}`}
            style={{
                transform: computedTransform,
                transformOrigin: 'center center',
            }}
        />
    )
}