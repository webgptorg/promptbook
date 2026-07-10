import type { NextConfig } from 'next';
import path from 'path';

/**
 * Map of next config.
 */
const nextConfig: NextConfig = {
    serverExternalPackages: ['@napi-rs/canvas'],

    experimental: {
        externalDir: true,
    },

    turbopack: {
        // Note: Set this to your monorepo root (where the shared folder lives)
        root: path.join(__dirname, '..', '..'),

        resolveAlias: {
            '@': path.resolve(__dirname, 'src'),
            '@public': path.resolve(__dirname, 'public'),
            '@common': path.resolve(__dirname, '../common'),
            '@promptbook-local': path.resolve(__dirname, '../../src/_packages'),
            '@promptbook-source': path.resolve(__dirname, '../../src'),
        },
    },
};

export default nextConfig;
