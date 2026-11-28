import jsonPlugin from '@rollup/plugin-json';
import typescriptPlugin from '@rollup/plugin-typescript';
import urlPlugin from '@rollup/plugin-url'; // <- TODO: [😺] Use or uninstall
import { builtinModules } from 'module';
import { readdirSync } from 'fs';
import { join } from 'path';
import polyfillNode from 'rollup-plugin-polyfill-node';
import postcss from 'rollup-plugin-postcss';
import { visualizer } from 'rollup-plugin-visualizer';
import { dependencies, version } from './package.json';

// Note: Note using raw imports via `rollup-plugin-raw` - it is not maintained and has security and compatibility issues

/**
 * Builds the Rollup configuration for every generated runtime package.
 */
export default function () {
    return getPackagesMetadataForRollup()
        .filter(({ isBuilded }) => isBuilded)
        .map(({ packageBasename, entryIndexFilePath, additionalDependencies }) => {
            const output = [
                {
                    file: `./packages/${packageBasename}/esm/index.es.js`,
                    format: 'es',
                    sourcemap: true,
                    inlineDynamicImports: true,
                },
                {
                    file: `./packages/${packageBasename}/umd/index.umd.js`,
                    name: `promptbook-${packageBasename}`,
                    format: 'umd',
                    sourcemap: true,
                    inlineDynamicImports: true,
                },
            ];

            const plugins = [
                typescriptPlugin({
                    tsconfig: './tsconfig.json',
                    //       <- Note: This is essential proper type declaration generation
                }),
                jsonPlugin({
                    preferConst: true,
                    compact: true,
                }),
                // TODO: [😺] Use or remove:
                urlPlugin({
                    include: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.stl'],
                    // limit: 8192, // <- Note: files under 8kb → base64 inline
                    limit: 1000000000,
                    emitFiles: true, // <- Note: Copy larger files to output dir
                    fileName: '[dirname][name][extname]',
                }),
            ];

            const external = createPackageExternalPredicate(additionalDependencies);

            const packageFullname = `@promptbook/${packageBasename}`;

            // Add CSS module support for components package
            if (packageFullname === '@promptbook/components') {
                plugins.push(
                    postcss({
                        modules: true,
                        extract: false, // Inline CSS in JS bundle
                        minimize: true,
                        sourceMap: true,
                    }),
                );
            }
            if (
                // TODO: [💚] DRY
                packageFullname !== '@promptbook/node' &&
                packageFullname !== '@promptbook/cli' &&
                packageFullname !== '@promptbook/documents' &&
                packageFullname !== '@promptbook/legacy-documents' &&
                packageFullname !== '@promptbook/website-crawler'
            ) {
                plugins.push(polyfillNode);
            } else {
                /*
                TODO: [🧠] Maybe node-only packages should use something different than `umd`
                    @see https://rollupjs.org/configuration-options/#output-format
                    > output.push({
                    >     file: `./packages/${packageBasename}/umd/index.cjs.js`, // <- Do not forget to change link to this file across the project
                    >     name: `promptbook-${packageBasename}`,
                    >     format: 'cjs',
                    >     sourcemap: true,
                    > });
                */
            }

            const isPreRelease = version.includes('-');

            if (!isPreRelease) {
                // <- Note: Do not generate stats for pre-releases to shotten the build time
                plugins.push(
                    visualizer({
                        emitFile: true,
                        filename: 'stats.html', // <- TODO: [🧠] Pick better filename for this
                    }),
                );
            }

            console.info(`Building ${packageFullname} v${version}${isPreRelease ? ' (pre-release)' : ''}`);

            return {
                input: entryIndexFilePath,
                output,
                plugins,
                external,
            };
        });
}

/**
 * Keeps declared runtime dependencies and their subpaths out of generated bundles.
 *
 * The TypeScript plugin can resolve a dependency to a declaration file, which Rollup cannot execute.
 * Use the same dependency names as manifest generation instead of maintaining a second package list.
 *
 * @param additionalDependencies - Runtime dependencies declared by this package's metadata
 * @returns Rollup predicate for external module specifiers
 * @private internal utility of package generation
 */
export function createPackageExternalPredicate(additionalDependencies = []) {
    const externalModuleNames = new Set([...builtinModules, ...Object.keys(dependencies), ...additionalDependencies]);

    return (moduleId) => {
        if (moduleId.startsWith('node:')) {
            return true;
        }

        // Match package boundaries so `zod/v4` is external while `zod-like` and local files stay bundled.
        const moduleParts = moduleId.split('/');
        const packageName = moduleId.startsWith('@') ? moduleParts.slice(0, 2).join('/') : moduleParts[0];

        return externalModuleNames.has(packageName);
    };
}

/**
 * Gets metadata of all packages of Promptbook ecosystem
 *
 * There are 2 similar functions:
 * - `getPackagesMetadata` Async version with declared types and extended information, use this in scripts
 * - `getPackagesMetadataForRollup` - Sync version with less information, use this ONLY in rollup config
 */
export function getPackagesMetadataForRollup() {
    const packagesMetadata = [];

    const dirents = readdirSync(join(__dirname, 'src/_packages'), { recursive: false, withFileTypes: true });
    //                         <- Note: In production it is not good practice to use synchronous functions
    //                                  But this is only tooling code and it is not a problem
    //                                  Unfortunately, there is no way to use async configuration in rollup.config.js

    for (const dirent of dirents) {
        if (!dirent.isFile()) {
            continue;
        }

        if (!dirent.name.endsWith('.index.ts')) {
            continue;
        }

        const packageBasename = dirent.name.split('.').shift();

        if (!packageBasename) {
            throw new Error('Invalid package name');
        }

        packagesMetadata.push({
            entryIndexFilePath: `./src/_packages/${packageBasename}.index.ts`,
            readmeFilePath: `./src/_packages/${packageBasename}.readme.md`,
            isBuilded: true,
            packageScope: 'promptbook',
            packageBasename,
            packageFullname: `@promptbook/${packageBasename}`,
            additionalDependencies:
                packageBasename === 'cli'
                    ? [
                          'typescript',
                          'ts-node',
                          'next',
                          'lucide-react',
                          'raw-loader',
                          'tailwindcss',
                          '@tailwindcss/typography',
                          'postcss',
                          'autoprefixer',
                          ...Object.keys(dependencies),
                      ]
                    : [],
        });
    }

    packagesMetadata.push({
        readmeFilePath: `./src/_packages/promptbook.readme.md`,
        entryIndexFilePath: null,
        isBuilded: false,
        packageScope: null,
        packageBasename: 'promptbook',
        packageFullname: 'promptbook',
        additionalDependencies: packagesMetadata.map(({ packageFullname }) => packageFullname) /* <- Note: [🧃] */,
    });

    packagesMetadata.push({
        readmeFilePath: `./src/_packages/ptbk.readme.md`,
        entryIndexFilePath: null,
        isBuilded: false,
        packageScope: null,
        packageBasename: 'ptbk',
        packageFullname: 'ptbk',
        additionalDependencies: ['promptbook' /* <- Note: [🧃] */],
    });

    /*/
    // <- Note: Keep for testing single package
    //    Run:> npx rollup --config rollup.config.js
    //          or
    //        > node --max-old-space-size=8000 ./node_modules/rollup/dist/bin/rollup  --config rollup.config.js
    return packagesMetadata.filter(({ packageFullname }) => packageFullname === '@promptbook/website-crawler');
    /**/

    /**/
    // Note: Support building a single package via PACKAGE_BASENAME environment variable
    const singlePackageBasename = process.env.PACKAGE_BASENAME;
    if (singlePackageBasename) {
        return packagesMetadata.filter(({ packageBasename }) => packageBasename === singlePackageBasename);
    }

    return packagesMetadata;
    /**/
}

// Note: [🧃] Packages `@promptbook/cli` and `@promptbook/types` are marked as dependencies (not devDependencies) to ensure that they are always installed
// TODO: Maybe make `PackageMetadata` as discriminated union - isBuilded+entryIndexFilePath
