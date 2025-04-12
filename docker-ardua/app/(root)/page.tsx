"use server"
import { Container } from '@/components/container';
import { HEROES_CLIENT } from '@/components/HEROES_CLIENT';
import { getUserSession } from '@/components/lib/get-user-session';
import { redirect } from 'next/navigation';
import React, { Suspense } from 'react';
import Loading from "@/app/(root)/loading";
import {prisma} from "@/prisma/prisma-client";
import SocketClient from "@/components/SocketClient";

export default async function Home() {
    const session = await getUserSession();

    if (!session?.id) {
        return (
            <Container className="flex flex-col my-10">
                <Suspense fallback={<Loading />}>
                РЕГИСТРАЦИЯ
                </Suspense>
            </Container>
        );
    }

    const user = await prisma.user.findFirst({
        where: {
            id: Number(session.id)
        }
    });

    if (user) {
        return (
            <Container className="flex flex-col my-10">
                <Suspense fallback={<Loading />}>
                    <SocketClient/>
                </Suspense>
            </Container>
        );
    }
}