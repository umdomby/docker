// file: docker-webrtc-js/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    // Отключаем только конфликтующие части HMR для WebSocket
    webpack: (config, { dev, isServer }) => {
        if (dev && !isServer) {
            // Сохраняем оригинальный HMR, но настраиваем его для работы с нашим WS
            config.watchOptions = {
                poll: 1000,
                aggregateTimeout: 300,
            };

            // Добавляем fallback для WS соединений
            config.resolve.fallback = {
                ...config.resolve.fallback,
                net: false,
                tls: false,
                dns: false,
                fs: false,
                child_process: false
            };
        }
        return config;
    },

    // Настройки для работы с WebSocket
    serverExternalPackages: ['ws'],
    experimental: {
        serverActions: true,
        webpackBuildWorker: true
    },

    // Настройки заголовков
    async headers() {
        return [
            {
                source: '/ws',
                headers: [
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: '*',
                    },
                    {
                        key: 'Access-Control-Allow-Methods',
                        value: 'GET, POST, PUT, DELETE, OPTIONS',
                    },
                    {
                        key: 'Access-Control-Allow-Headers',
                        value: 'X-Requested-With, Content-Type, Authorization',
                    }
                ],
            }
        ];
    },

    // Настройки прокси
    async rewrites() {
        return [
            {
                source: '/ws',
                destination: 'http://192.168.0.151:8080/ws',
            },
            {
                source: '/api/:path*',
                destination: 'http://192.168.0.151:8080/api/:path*',
            }
        ];
    }
};

export default nextConfig;