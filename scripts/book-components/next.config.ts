import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
    experimental: {
        externalDir: true,
    },

    turbopack: {
        // Note: Set this to your monorepo root (where the shared folder lives)
        root: path.join(__dirname, '..', '..'),

        resolveAlias: {
            '@': path.resolve(__dirname, 'src'),
            '@promptbook-local': path.resolve(__dirname, '../../src/_packages'),
        },
    },

    /*/
    // Note: In case you need to use Webpack instead of Turbopack
    webpack(config) {
        // Use TsconfigPathsPlugin for all path alias resolution
        config.resolve.plugins = config.resolve.plugins || [];
        config.resolve.plugins.push(
            new TsconfigPathsPlugin({
                configFile: path.resolve(__dirname, 'tsconfig.json'),
                extensions: config.resolve.extensions,
            }),
        );
        return config;
    },
    /**/
};

export default nextConfig;
