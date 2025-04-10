/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
                port: '',
            },
        ]
    },
    // Конфигурация для standalone-режима
    //output: 'standalone',
    experimental: {
        serverActions: {
            bodySizeLimit: '5mb',
            serverActions: true,
            allowedOrigins: ['localhost:3000/', 'localhost:3005/','https://ardu.site/', '192.168.1.151:3005'],
        },
    },
    eslint: {
        ignoreDuringBuilds: true, // Добавьте эту строку
    },
};

export default nextConfig;
