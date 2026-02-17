import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
    // output: 'standalone',
    // <- TODO: [🐱‍🚀][🧠] How to properly build Next.js app, for both Vercel and Doceker?

    experimental: {
        externalDir: true,
    },

    turbopack: {
        // Note: Set this to your monorepo root (where the shared folder lives)
        root: path.join(__dirname, '..', '..'),

        resolveAlias: {
            '@': path.resolve(__dirname),
            '@common': path.resolve(__dirname, '../common'),
            '@promptbook-local': path.resolve(__dirname, '../../src/_packages'),
        },
    },

    webpack(config, { isServer }) {
        // Exclude Node.js-only modules from client bundle
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                dns: false,
                child_process: false,
                // jsdom and related dependencies that require Node.js APIs
                canvas: false,
            };
        }

        config.module.rules.push({
            test: /\.txt$/,
            use: 'raw-loader',
        });

        return config;
    },
    async headers() {
        return [
            {
                source: '/',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'max-age=0, s-maxage=1, stale-while-revalidate=59',
                    },
                    {
                        key: 'Vary',
                        value: 'Cookie',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
