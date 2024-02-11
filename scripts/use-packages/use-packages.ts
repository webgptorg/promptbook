#!/usr/bin/env ts-node

import chalk from 'chalk';
import commander from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { PackageJson } from 'type-fest';
import { forTime } from 'waitasecond';
import { commit } from '../utils/autocommit/commit';
import { execCommand } from '../utils/execCommand/execCommand';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(chalk.red(`CWD must be root of the project`));
    process.exit(1);
}

const program = new commander.Command();
program.parse(process.argv);

program.parse(process.argv);

usePackages()
    .catch((error: Error) => {
        console.error(chalk.bgRed(error.name));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function usePackages() {
    console.info(`🌍  Using packages`);

    let isWaitedForNpm = false;
    for (const remoteFolder of ['../webgpt-app', './samples/usage']) {
        const mainPackageJson = JSON.parse(await readFile('./package.json', 'utf-8')) as PackageJson;
        const currentVersion = mainPackageJson.version;

        const remotePackageJsonPath = join(remoteFolder, 'package.json');
        const remotePackageJson = JSON.parse(await readFile(remotePackageJsonPath, 'utf-8')) as PackageJson;

        for (const dependenciesType of ['dependencies', 'devDependencies']) {
            if (remotePackageJson[dependenciesType] === undefined) {
                continue;
            }
            for (const packageName of Object.keys(remotePackageJson[dependenciesType] as Record<string, string>)) {
                if (!packageName.startsWith('@promptbook/')) {
                    continue;
                }

                remotePackageJson[dependenciesType]![packageName] = currentVersion;
            }
        }

        await writeFile(remotePackageJsonPath, JSON.stringify(remotePackageJson, null, 4) + '\n');
        console.info(chalk.green(`Update version of @promptbook/* to ${currentVersion} in ${remotePackageJsonPath}`));

        if (!isWaitedForNpm) {
            await forTime(
                1000 *
                    120 /* seconds <- Note: This is empiric time how long it takes to perform GitHub Action and publish all NPM packages */,
            );
            isWaitedForNpm = true;
        }

        await execCommand({
            cwd: remoteFolder,
            crashOnError: false,
            command: `npm i`,
        });

        if (remoteFolder === './samples/usage') {
            // Note: No need to check that folder is clean, because this script is executed only after new version which can be triggered only from clean state
            await commit(remoteFolder, `Update promptbook to version ${currentVersion} in samples`);
        }
    }

    console.info(`[ 🌍  Using packages ]`);
}

/**
 * TODO: !! [👵] test before publish
 * TODO: !!! Auto update version of @promptbook/* in samples
 * TODO: !! Add warning to the copy/used files
 * TODO: !! Use prettier to format the used files
 * TODO: !! Normalize order of keys in package.json
 */
