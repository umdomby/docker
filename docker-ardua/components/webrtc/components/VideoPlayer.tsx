import { useEffect, useRef, useState } from 'react'

interface VideoPlayerProps {
    stream: MediaStream | null;
    muted?: boolean;
    className?: string;
    transform?: string;
}

type VideoSettings = {
    rotation: number;
    flipH: boolean;
    flipV: boolean;
};

export const VideoPlayer = ({ stream, muted = false, className, transform }: VideoPlayerProps) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [computedTransform, setComputedTransform] = useState<string>('')

    useEffect(() => {
        // Применяем трансформации при каждом обновлении transform
        if (typeof transform === 'string') {
            setComputedTransform(transform)
        } else {
            try {
                const saved = localStorage.getItem('videoSettings')
                if (saved) {
                    const { rotation, flipH, flipV } = JSON.parse(saved) as VideoSettings
                    let fallbackTransform = ''
                    if (rotation !== 0) fallbackTransform += `rotate(${rotation}deg) `
                    fallbackTransform += `scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`
                    setComputedTransform(fallbackTransform)
                } else {
                    setComputedTransform('')
                }
            } catch (e) {
                console.error('Error parsing saved video settings:', e)
                setComputedTransform('')
            }
        }
    }, [transform])

    useEffect(() => {
        const video = videoRef.current
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
    }, [stream])

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            className={className}
            style={{ transform: computedTransform, transformOrigin: 'center center' }}
        />
    )
}
