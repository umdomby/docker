'use server'
import { Nunito } from 'next/font/google';
import './globals.css';


const nunito = Nunito({
    subsets: ['cyrillic'],
    variable: '--font-nunito',
    weight: ['400', '500', '600', '700', '800', '900'],
});

export default async function RootLayout({
                                             children,
                                         }: Readonly<{
    children: React.ReactNode;
}>) {

    return (
        <html lang="en">
        <head>
            {/*<link data-rh="true" rel="icon" href="/logo.webp" />*/}
        </head>
        <body className={nunito.className}>
            <main>{children}</main>
        </body>
        </html>
    );
}