import type { NextConfig } from 'next';
import { readdirSync } from 'fs';
import path from 'path';

/**
 * Next.js build output directory.
 *
 * E2E runs can override this to isolate their build artifacts from local dev servers on Windows,
 * which prevents `.next/trace` file locking collisions.
 */
const nextDistDir = process.env.NEXT_DIST_DIR || '.next';

/**
 * Dependency root passed by `ptbk agents-server` when the bundled app is copied into a project cache.
 */
const agentsServerNodeModulesPath = process.env.PTBK_AGENTS_SERVER_NODE_MODULES_PATH;

/**
 * Whether the CLI-owned build should skip duplicate validation already covered by repository tests.
 */
const isNextValidationIgnored = process.env.PTBK_AGENTS_SERVER_IGNORE_NEXT_VALIDATION === 'true';

/**
 * Exact aliases for local generated Promptbook package entrypoints.
 */
const promptbookLocalPackageAliases = createPromptbookLocalPackageAliases();

/**
 * Map of next config.
 */
const nextConfig: NextConfig = {
    // output: 'standalone',
    // <- TODO: [🐱‍🚀][🧠] How to properly build Next.js app, for both Vercel and Doceker?

    distDir: nextDistDir,
    eslint: {
        ignoreDuringBuilds: isNextValidationIgnored,
    },
    serverExternalPackages: [
        'pg',
        'better-sqlite3',
        '@prisma/studio-core',
        '@napi-rs/canvas',
        'playwright',
        'playwright-core',
    ],
    typescript: {
        ignoreBuildErrors: isNextValidationIgnored,
    },

    experimental: {
        externalDir: true,
    },

    turbopack: {
        // Note: Set this to your monorepo root (where the shared folder lives)
        root: path.join(__dirname, '..', '..'),

        resolveAlias: {
            '@': path.resolve(__dirname),
            '@common': path.resolve(__dirname, '../_common'),
            ...promptbookLocalPackageAliases,
        },
    },

    webpack(config, { isServer }) {
        config.resolve.alias = {
            ...config.resolve.alias,
            '@': path.resolve(__dirname),
            '@common': path.resolve(__dirname, '../_common'),
            ...promptbookLocalPackageAliases,
        };

        if (agentsServerNodeModulesPath) {
            config.resolve.modules = Array.from(
                new Set([...(config.resolve.modules || ['node_modules']), agentsServerNodeModulesPath]),
            );
        }

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

        config.module.rules.push({
            test: /\.yaml$/,
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

/**
 * Creates webpack/Turbopack aliases from imports like `@promptbook-local/core` to generated local sources.
 */
function createPromptbookLocalPackageAliases(): Record<string, string> {
    const packagesIndexPath = path.resolve(__dirname, '../../src/_packages');

    try {
        return Object.fromEntries(
            readdirSync(packagesIndexPath)
                .filter((filename) => filename.endsWith('.index.ts'))
                .map((filename) => [
                    `@promptbook-local/${filename.replace(/\.index\.ts$/u, '')}`,
                    path.resolve(packagesIndexPath, filename),
                ]),
        );
    } catch {
        return {};
    }
}
