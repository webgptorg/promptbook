#!/usr/bin/env ts-node

import chalk from 'chalk';
import commander from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { PackageJson } from 'type-fest';
import { forTime } from 'waitasecond';
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

    const mainPackageJson = JSON.parse(await readFile('./package.json', 'utf-8')) as PackageJson;
    const currentVersion = mainPackageJson.version;

    const remoteFolder = '../webgpt-app'; // <- TODO: Update also in the sample here
    const remotePackageJsonPath = join(remoteFolder, 'package.json');
    const remotePackageJson = JSON.parse(await readFile(remotePackageJsonPath, 'utf-8')) as PackageJson;

    for (const dependenciesType of ['dependencies', 'devDependencies']) {
        for (const packageName of Object.keys(remotePackageJson[dependenciesType] as Record<string, string>)) {
            if (!packageName.startsWith('@promptbook/')) {
                continue;
            }

            remotePackageJson[dependenciesType]![packageName] = currentVersion;
        }
    }

    await writeFile(remotePackageJsonPath, JSON.stringify(remotePackageJson, null, 4) + '\n');
    console.info(chalk.green(`Update version of @promptbook/* to ${currentVersion} in ${remotePackageJsonPath}`));

    await forTime(
        1000 *
            100 /* seconds <- Note: This is empiric time how long it takes to perform GitHub Action and publish all NPM packages */,
    );

    await execCommand({
        cwd: remoteFolder,
        crashOnError: false,
        command: `npm i`,
    });

    console.info(`[ 🌍  Using packages ]`);
}

/**
 * TODO: !! [👵] test before publish
 * TODO: !!! Auto update version of @promptbook/* in samples
 * TODO: !! Add warning to the copy/used files
 * TODO: !! Use prettier to format the used files
 * TODO: !! Normalize order of keys in package.json
 */
