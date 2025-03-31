//app\webrtc\lib\webrtc.ts
export function checkWebRTCSupport(): boolean {
    if (typeof window === 'undefined') return false;

    const requiredAPIs = [
        'RTCPeerConnection',
        'RTCSessionDescription',
        'RTCIceCandidate',
        'MediaStream',
        'navigator.mediaDevices.getUserMedia'
    ];

    return requiredAPIs.every(api => {
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
}

export function getBrowserName(): string {
    const userAgent = navigator.userAgent;

    if (userAgent.match(/chrome|chromium|crios/i)) {
        return 'Chrome';
    } else if (userAgent.match(/firefox|fxios/i)) {
        return 'Firefox';
    } else if (userAgent.match(/safari/i) && !userAgent.match(/chrome|chromium|crios/i)) {
        return 'Safari';
    } else if (userAgent.match(/opr\//i)) {
        return 'Opera';
    } else if (userAgent.match(/edg/i)) {
        return 'Edge';
    }
    return 'Unknown';
}

export async function getDeviceInfo(): Promise<MediaDeviceInfo[]> {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.map(device => ({
            ...device,
            label: device.label || `Unknown ${device.kind}`
        }));
    } catch (error) {
        console.error('Error enumerating devices:', error);
        return [];
    }
}

export async function checkPermissions(): Promise<{
    camera: PermissionState | 'not_found';
    microphone: PermissionState | 'not_found';
}> {
    const result = {
        camera: 'prompt' as PermissionState | 'not_found',
        microphone: 'prompt' as PermissionState | 'not_found'
    };

    try {
        const devices = await getDeviceInfo();
        const hasCamera = devices.some(d => d.kind === 'videoinput');
        const hasMicrophone = devices.some(d => d.kind === 'audioinput');

        if (!hasCamera) result.camera = 'not_found';
        if (!hasMicrophone) result.microphone = 'not_found';

        if (typeof navigator.permissions?.query === 'function') {
            if (hasCamera) {
                const cameraPermission = await navigator.permissions.query({ name: 'camera' as any });
                result.camera = cameraPermission.state;
            }
            if (hasMicrophone) {
                const microphonePermission = await navigator.permissions.query({ name: 'microphone' as any });
                result.microphone = microphonePermission.state;
            }
        }
    } catch (error) {
        console.error('Permission check error:', error);
    }

    return result;
}

export function getSystemInfo() {
    return {
        browser: getBrowserName(),
        os: getOS(),
        mobile: isMobile(),
        touch: isTouchDevice()
    };
}

function getOS(): string {
    const userAgent = navigator.userAgent;

    if (userAgent.match(/android/i)) return 'Android';
    if (userAgent.match(/iphone|ipad|ipod/i)) return 'iOS';
    if (userAgent.match(/windows/i)) return 'Windows';
    if (userAgent.match(/macintosh|mac os x/i)) return 'MacOS';
    if (userAgent.match(/linux/i)) return 'Linux';
    return 'Unknown';
}

function isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );
}

function isTouchDevice(): boolean {
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0
    );
}