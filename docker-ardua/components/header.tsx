'use client';

import { cn } from '@/components/lib/utils';
import React from 'react';
import { Container } from './container';
import Link from 'next/link';
import { ProfileButton } from './profile-button';
import { AuthModal } from './modals';
import { ModeToggle } from "@/components/buttonTheme";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from 'lucide-react';

interface Props {
    className?: string;
}

export const Header: React.FC<Props> = ({ className }) => {
    const [openAuthModal, setOpenAuthModal] = React.useState(false);

    return (
        <header className={cn(
            'border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
            'shadow-sm', // Добавляем легкую тень
            className
        )}>
            <Container className="flex items-center justify-between py-3">
                {/* Кнопка для открытия Sheet (бургер-меню) */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-secondary/50 text-foreground/80 hover:text-foreground"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent
                        side="left"
                        className="w-[280px] sm:w-[300px] bg-background"
                    >
                        <SheetHeader className="text-left">
                            <SheetTitle className="text-foreground">
                                <Link href="/" className="flex items-center gap-3 p-4">
                                    <h1 className="text-2xl font-black">
                                        Ardu<span className="text-primary">A</span>
                                    </h1>
                                </Link>
                            </SheetTitle>
                            <SheetDescription className="sr-only">
                                Навигационное меню
                            </SheetDescription>
                        </SheetHeader>

                        {/* Основное содержимое меню */}
                        {/*<div className="flex-1 flex flex-col gap-1 mt-4">*/}
                        {/*    <SheetClose asChild>*/}
                        {/*        <Link*/}
                        {/*            href="/"*/}
                        {/*            className="px-4 py-3 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"*/}
                        {/*        >*/}
                        {/*            Главная*/}
                        {/*        </Link>*/}
                        {/*    </SheetClose>*/}
                        {/*    <SheetClose asChild>*/}
                        {/*        <Link*/}
                        {/*            href="/about"*/}
                        {/*            className="px-4 py-3 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"*/}
                        {/*        >*/}
                        {/*            О нас*/}
                        {/*        </Link>*/}
                        {/*    </SheetClose>*/}
                        {/*    <SheetClose asChild>*/}
                        {/*        <Link*/}
                        {/*            href="/projects"*/}
                        {/*            className="px-4 py-3 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"*/}
                        {/*        >*/}
                        {/*            Проекты*/}
                        {/*        </Link>*/}
                        {/*    </SheetClose>*/}
                        {/*</div>*/}

                        {/* Нижняя часть с кнопками */}
                        <SheetFooter className="mt-auto border-t border-border/40 pt-4">
                            <div className="flex items-center justify-between w-full">
                                <Link href="/">Home</Link>
                                <ModeToggle/>
                                <div className="flex items-center gap-2">
                                    <AuthModal open={openAuthModal} onClose={() => setOpenAuthModal(false)}/>
                                    <ProfileButton onClickSignIn={() => setOpenAuthModal(true)}/>
                                </div>
                            </div>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>

                {/* Основной заголовок, видимый всегда */}
                {/*<Link href="/">*/}
                {/*    <h1 className="text-2xl font-black text-foreground">*/}
                {/*        Ardu<span className="text-primary">A</span>*/}
                {/*    </h1>*/}
                {/*</Link>*/}

                {/*/!* Кнопки профиля, видимые всегда *!/*/}
                {/*<div className="flex items-center gap-3">*/}
                {/*    <ModeToggle/>*/}
                {/*    <AuthModal open={openAuthModal} onClose={() => setOpenAuthModal(false)}/>*/}
                {/*    <ProfileButton onClickSignIn={() => setOpenAuthModal(true)}/>*/}
                {/*</div>*/}
            </Container>
        </header>
    );
};