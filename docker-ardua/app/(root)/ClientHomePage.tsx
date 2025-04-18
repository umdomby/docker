// app/(root)/ClientHomePage.tsx
'use client'

import { SocketClient } from '@/components/control/SocketClient'
import { Joystick } from '@/components/control/Joystick'
import WebRTC from '@/components/webrtc'
import { useAutoConnectSocket } from '@/hooks/useAutoConnectSocket'

export default function ClientHomePage() {
    // Автоподключение при наличии флага autoConnect
    useAutoConnectSocket()

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <div className="space-y-4">
                <SocketClient />
                <Joystick />
            </div>

            <div>
                <WebRTC />
            </div>
        </div>
    )
}