#!/usr/bin/env ts-node

import chalk from 'chalk';
import commander from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import spaceTrim from 'spacetrim';
import { PackageJson } from 'type-fest';
import YAML from 'yaml';
import { packageNames } from '../../rollup.config';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(chalk.red(`CWD must be root of the project`));
    process.exit(1);
}

const program = new commander.Command();
program.option('--commit', `Autocommit changes`, false);
program.parse(process.argv);

program.parse(process.argv);
const { commit: isCommited } = program.opts();

generatePackages({ isCommited })
    .catch((error: Error) => {
        console.error(chalk.bgRed(error.name));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function generatePackages({ isCommited }: { isCommited: boolean }) {
    console.info(`📦  Generating packages`);

    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    const mainPackageJson = JSON.parse(await readFile('./package.json', 'utf-8')) as PackageJson;

    for (const packageName of packageNames) {
        await writeFile(
            `./packages/${packageName}/README.md`,
            spaceTrim(`

                # 🌠 Prompt template pipelines

                Library to supercharge your use of large language models

                [Read the manual](https://github.com/webgptorg/ptp)

        `), // <- TODO: [🧠] Maybe make custom README.md for each package
        );

        const packageJson = JSON.parse(JSON.stringify(mainPackageJson) /* <- Note: Make deep copy */) as PackageJson;
        delete packageJson.scripts;
        packageJson.name = `@gptp/${packageName}`;
        packageJson.peerDependencies = {
            '@gptp/core': packageJson.version,
        };
        packageJson.main = `./umd/index.umd.js`;
        packageJson.module = `./esm/index.es.js`;
        packageJson.typings = `./esm/typings/_packages/${packageName}.index.d.ts`;
        // TODO: !!! Filter out dependencies only for the current package
        await writeFile(`./packages/${packageName}/package.json`, JSON.stringify(packageJson, null, 4) + '\n');
    }

    await writeFile(
        `./.github/workflows/publish.yml`,
        YAML.stringify(
            {
                name: 'Publish new version',
                on: {
                    push: {
                        tags: ['v*'],
                    },
                },
                jobs: {
                    'publish-npm': {
                        name: 'Publish on NPM package registry',
                        'runs-on': 'ubuntu-latest',
                        steps: [
                            {
                                name: 'Checkout',
                                uses: 'actions/checkout@v2',
                            },
                            {
                                name: 'Setup Node.js',
                                uses: 'actions/setup-node@v1',
                                with: {
                                    'node-version': 18,
                                    'registry-url': 'https://registry.npmjs.org/',
                                },
                            },
                            {
                                name: 'Install dependencies',
                                run: 'npm ci',
                            },
                            {
                                name: 'Build packages bundles',
                                run: 'npm run build-bundles',
                            },
                            ...packageNames.map((packageName) => ({
                                name: `Publish @gptp/${packageName}`,
                                'working-directory': `./packages/${packageName}`,
                                run: 'npm publish --access public',
                                env: {
                                    NODE_AUTH_TOKEN: '${{secrets.NPM_TOKEN}}',
                                },
                            })),
                        ],
                    },
                },
            },
            { indent: 4 },
        )
            .split('"')
            .join("'") /* <- TODO: Can the replace be done directly in YAML.stringify options? */,
    );

    if (isCommited) {
        await commit('packages', `📦 Generating packages`);
    }

    console.info(`[ 📦  Generating packages ]`);
}

/**
 * TODO: !! [👵] test before publish
 * TODO: !! Add warning to the copy/generated files
 * TODO: !! Use prettier to format the generated files
 * TODO: !! Normalize order of keys in package.json
 */
