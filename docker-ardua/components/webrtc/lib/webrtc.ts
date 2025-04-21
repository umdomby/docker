//app\webrtc\lib\webrtc.ts
export function checkWebRTCSupport(): boolean {
    if (typeof window === 'undefined') return false;

    // Основные API WebRTC
    const requiredAPIs = [
        'RTCPeerConnection',
        'RTCSessionDescription',
        'RTCIceCandidate',
        'MediaStream',
        'navigator.mediaDevices.getUserMedia'
    ];

    // Проверка каждого API
    const hasAPIs = requiredAPIs.every(api => {
        try {
            if (api.includes('.')) {
                const [obj, prop] = api.split('.');
                return (window as any)[obj]?.[prop] !== undefined;
            }
            return (window as any)[api] !== undefined;
        } catch {
            return false;
        }
    });

    if (!hasAPIs) return false;

    // Дополнительная проверка функциональности
    try {
        const pc = new RTCPeerConnection();
        const canCreateOffer = typeof pc.createOffer === 'function';
        const canCreateDataChannel = typeof pc.createDataChannel === 'function';
        pc.close();

        return canCreateOffer && canCreateDataChannel;
    } catch (e) {
        console.error('WebRTC support check failed:', e);
        return false;
    }
}





