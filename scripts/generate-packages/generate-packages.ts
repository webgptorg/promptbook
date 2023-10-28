#!/usr/bin/env ts-node

import chalk from 'chalk';
import commander from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import spaceTrim from 'spacetrim';
import { PackageJson } from 'type-fest';
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
        packageJson.name = `@gptp/${packageName}`;
        packageJson.peerDependencies = {
            '@gptp/core': packageJson.version,
        };
        // TODO: !!! Filter out dependencies only for the current package
        // TODO: !!! Sync typings in package.json
        await writeFile(`./packages/${packageName}/package.json`, JSON.stringify(packageJson, null, 4) + '\n');
    }

    if (isCommited) {
        await commit('packages', `📦 Generating packages`);
    }

    console.info(`[ 📦  Generating packages ]`);
}

/**
 *
 * TODO: !!! Sync Package.json + add copy warning
 * TODO: !!! Automatic script after build to generate theese things
 * TODO: !!! Automatic script for publishing packages to npm after version
 * TODO: !! Use prettier to format the generated files
 */
