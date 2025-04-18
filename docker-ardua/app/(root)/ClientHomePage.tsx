// app/(root)/ClientHomePage.tsx
'use client'

import WebRTC from "@/components/webrtc";
import { useAutoConnectSocket } from '@/hooks/useAutoConnectSocket'

export default function ClientHomePage() {
    useAutoConnectSocket()
    return <WebRTC />
}