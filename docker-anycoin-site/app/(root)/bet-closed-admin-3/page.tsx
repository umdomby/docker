"use server";
import { Container } from '@/components/container';
import { prisma } from '@/prisma/prisma-client';
import { redirect } from 'next/navigation';
import React, { Suspense } from "react";
import Loading from "@/app/(root)/loading";
import { getUserSession } from "@/components/lib/get-user-session";
import { HEROES_CLIENT_CLOSED_3_A } from "@/components/HEROES_CLIENT_CLOSED_3_A";

export default async function BetClosedPage() {
    const session = await getUserSession();

    if (!session) {
        return redirect('/');
    }

    const user = await prisma.user.findFirst({ where: { id: Number(session?.id) } });

    if (!user || user.role !== 'ADMIN') {
        return redirect('/');
    }

    // Получаем все закрытые ставки на трех игроков
    const closedBets = await prisma.betCLOSED3.findMany({
        include: {
            participantsCLOSED3: {
                include: {
                    user: true,
                },
            },
            player1: true,
            player2: true,
            player3: true,
        },
        orderBy: {
            updatedAt: 'desc'
        }
    });

    return (
        <Container className="w-[100%]">
            <Suspense fallback={<Loading />}>
                <HEROES_CLIENT_CLOSED_3_A user={user} closedBets={closedBets} />
            </Suspense>
        </Container>
    );
}