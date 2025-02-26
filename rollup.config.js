import jsonPlugin from '@rollup/plugin-json';
import typescriptPlugin from '@rollup/plugin-typescript';
import { readdirSync } from 'fs';
import { join } from 'path';
import polyfillNode from 'rollup-plugin-polyfill-node';
import { visualizer } from 'rollup-plugin-visualizer';
import { version } from './package.json';

// Note: Note using raw imports via `rollup-plugin-raw` - it is not maintained and has security and compatibility issues

export default function () {
    return getPackagesMetadataForRollup()
        .filter(({ isBuilded }) => isBuilded)
        .map(({ packageBasename, entryIndexFilePath }) => {
            const output = [
                {
                    file: `./packages/${packageBasename}/esm/index.es.js`,
                    format: 'es',
                    sourcemap: true,
                },
                {
                    file: `./packages/${packageBasename}/umd/index.umd.js`,
                    name: `promptbook-${packageBasename}`,
                    format: 'umd',
                    sourcemap: true,
                },
            ];

            const plugins = [
                typescriptPlugin({
                    tsconfig: './tsconfig.json',
                    //       <- Note: This is essential propper type declaration generation
                }),
                jsonPlugin({
                    preferConst: true,
                    compact: true,
                }),
            ];

            const packageFullname = `@promptbook/${packageBasename}`;
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
            };
        });
}

/**
 * Gets metadata of all packages of Promptbook ecosystem
 *
 * There are 2 simmilar functions:
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
            additionalDependencies: [],
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
    return packagesMetadata;
    /**/
}

/**
 * Note: [🧃] Packages `@promptbook/cli` and `@promptbook/types` are marked as dependencies (not devDependencies) to ensure that they are always installed
 * TODO: Maybe make `PackageMetadata` as discriminated union - isBuilded+entryIndexFilePath
 */
