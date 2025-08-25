import type { NextConfig } from 'next';
import path from 'path';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';

const nextConfig: NextConfig = {
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
};

export default nextConfig;
