import jsonPlugin from '@rollup/plugin-json';
import typescriptPlugin from '@rollup/plugin-typescript';
import { readdirSync } from 'fs';
import { join } from 'path';

export const packages = readdirSync(join(__dirname, 'src/_packages'), { recursive: false, withFileTypes: true })
    .filter((dirent) => dirent.isFile())
    .filter((dirent) => dirent.name.endsWith('.index.ts'))
    .map((dirent) => dirent.name.split('.').shift())
    .map((packageName) => {
        if (!packageName) {
            throw new Error('Invalid package name');
        }
        return {
            isBuilded: true,
            packageScope: 'promptbook',
            packageName,
            packageFullname: `@promptbook/${packageName}`,
            dependencies: [
                // Note: Dependencies will be added automatically in generate-packages script
            ],
        };
    });

// Note: Packages `@promptbook/cli` and `@promptbook/types` are not marked as devDependencies in `promptbook` package to ensure that they are installed

packages.push({
    isBuilded: false,
    packageScope: null,
    packageName: 'promptbook',
    packageFullname: 'promptbook',
    dependencies: packages.map(({ packageFullname }) => packageFullname),
});

packages.push({
    isBuilded: false,
    packageScope: null,
    packageName: 'ptbk',
    packageFullname: 'ptbk',
    dependencies: ['promptbook'],
    devDependencies: [],
});

// console.info(packages);

export default packages
    .filter(({ isBuilded }) => isBuilded)
    .map(({ packageName }) => ({
        input: `./src/_packages/${packageName}.index.ts`,
        output: [
            {
                file: `./packages/${packageName}/umd/index.umd.js`,
                name: `promptbook-${packageName}`,
                format: 'umd',
                sourcemap: true,
            },
            {
                file: `./packages/${packageName}/esm/index.es.js`,
                format: 'es',
                sourcemap: true,
            },
        ],
        plugins: [
            typescriptPlugin({
                tsconfig: './tsconfig.json',
                //       <- Note: This is essential propper type declaration generation
            }),
            jsonPlugin({
                preferConst: true,
                compact: true,
            }),
        ],
    }));

/**
 * TODO: !!!!!! Keep typings only from esm or umd
 */
