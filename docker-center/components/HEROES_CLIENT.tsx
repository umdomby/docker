'use client';
import React from 'react';
import { PlayerChoice, User } from '@prisma/client';

import * as z from 'zod';


interface Props {
    user: User | null;
    className?: string;
}

export const HEROES_CLIENT: React.FC<Props> = ({ className, user }) => {

    return (
        <div>
            123
        </div>
    );
};