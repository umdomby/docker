'use server';

import {prisma} from '@/prisma/prisma-client';
import {getUserSession} from '@/components/lib/get-user-session';
import {Prisma} from '@prisma/client';
import {hashSync} from 'bcrypt';
import * as z from 'zod'
import { revalidatePath } from 'next/cache';

// Заглушка для получения разрешенных идентификаторов устройств
export async function getAllowedDeviceIds(): Promise<string[]> {
    return ['123', '222', '333', '444'];
}

export async function updateUserInfo(body: Prisma.UserUpdateInput) {
    try {
        const currentUser = await getUserSession();

        if (!currentUser) {
            throw new Error('Пользователь не найден');
        }

        const findUser = await prisma.user.findFirst({
            where: {
                id: Number(currentUser.id),
            },
        });

        if (!findUser) {
            throw new Error('Пользователь не найден в базе данных');
        }

        await prisma.user.update({
            where: {
                id: Number(currentUser.id),
            },
            data: {
                fullName: body.fullName,
                password: body.password ? hashSync(body.password as string, 10) : findUser.password,
            },
        });
        revalidatePath('/profile');
    } catch (err) {
        throw err;
    }
} // Функция для обновления информации о пользователе
