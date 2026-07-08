import type { NextConfig } from 'next';
import path from 'path';

/**
 * Next.js configuration for the ptbk coder landing page.
 */
const NEXT_CONFIG: NextConfig = {
    experimental: {
        externalDir: true,
    },

    turbopack: {
        root: path.join(__dirname, '..', '..'),

        resolveAlias: {
            '@': path.resolve(__dirname, 'src'),
            '@common': path.resolve(__dirname, '../_common'),
        },
    },

    webpack(config) {
        config.resolve.alias = {
            ...config.resolve.alias,
            '@': path.resolve(__dirname, 'src'),
            '@common': path.resolve(__dirname, '../_common'),
        };

        return config;
    },
};

export default NEXT_CONFIG;
