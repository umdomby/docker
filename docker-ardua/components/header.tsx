'use client';

import { cn } from '@/components/lib/utils';
import React from 'react';
import { Container } from './container';
import Image from 'next/image';
import Link from 'next/link';
import { ProfileButton } from './profile-button';
import { AuthModal } from './modals';
import {ModeToggle} from "@/components/buttonTheme";


interface Props {
    className?: string;
}

export const Header: React.FC<Props> = ({  className }) => {
    const [openAuthModal, setOpenAuthModal] = React.useState(false);

    return (
        <header className={cn('border-b', className)}>
            <Container className="flex items-center justify-between py-3">
                {/* Левая часть */}
                <Link href="/">
                    <div className="flex items-center gap-4">
                            {/*<Image*/}
                            {/*    src="/logo1.png"*/}
                            {/*    alt="Logo"*/}
                            {/*    width={65}*/}
                            {/*    height={65}*/}
                            {/*    priority*/}
                            {/*/>*/}
                        <div>
                            <h1 className="text-2xl font-black">
                                Ardu<span className="text-red-600">A</span>
                            </h1>
                        </div>
                    </div>
                </Link>


                {/* Правая часть */}
                <div className="flex items-center gap-3">
                    <ModeToggle/>
                    <AuthModal open={openAuthModal} onClose={() => setOpenAuthModal(false)}/>
                    <ProfileButton onClickSignIn={() => setOpenAuthModal(true)}/>
                </div>
            </Container>
        </header>
    );
};
