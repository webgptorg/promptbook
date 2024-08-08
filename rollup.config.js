import jsonPlugin from '@rollup/plugin-json';
import typescriptPlugin from '@rollup/plugin-typescript';
import { readdirSync } from 'fs';
import { join } from 'path';

export const packageInfos = readdirSync(join(__dirname, 'src/_packages'), { recursive: false, withFileTypes: true })
    .filter((dirent) => dirent.isFile())
    .filter((dirent) => dirent.name.endsWith('.index.ts'))
    .map((dirent) => ({ filePath: dirent.name, packageName: dirent.name.split('.').shift() }))
    .map((packageInfo) => {
        const { filePath, packageName } = packageInfo;

        if (!packageName) {
            throw new Error('Invalid package name');
        }
        return {
            filePath,
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

packageInfos.push({
    isBuilded: false,
    packageScope: null,
    packageName: 'promptbook',
    packageFullname: 'promptbook',
    dependencies: packageInfos.map(({ packageFullname }) => packageFullname),
});

packageInfos.push({
    isBuilded: false,
    packageScope: null,
    packageName: 'ptbk',
    packageFullname: 'ptbk',
    dependencies: ['promptbook'],
    devDependencies: [],
});

// console.info(packages);

export default packageInfos
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
