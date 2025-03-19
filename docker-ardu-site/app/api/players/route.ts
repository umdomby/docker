import { prisma } from '@/prisma/prisma-client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {

    const player = await prisma.player.findMany();

    return NextResponse.json(player);
}

// export async function POST(req: NextRequest) {
//     const data = await req.json();
//
//     const user = await prisma.player.create({
//         data,
//     });
//
//     return NextResponse.json(user);
// }
