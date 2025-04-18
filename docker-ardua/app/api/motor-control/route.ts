// app/api/motor-control/route.ts
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { deviceId, leftSpeed, rightSpeed } = await req.json()

        // Здесь должна быть логика отправки команд на ESP8266
        console.log('Received motor command:', { deviceId, leftSpeed, rightSpeed })

        return NextResponse.json({
            success: true,
            message: 'Command received'
        })
    } catch (error) {
        return NextResponse.json(
            { error: 'Invalid request' },
            { status: 400 }
        )
    }
}