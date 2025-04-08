#!/usr/bin/env ts-node
// use-packages.ts

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import fs, { readFile, writeFile } from 'fs/promises';
import { basename, join } from 'path';
import type { PackageJson } from 'type-fest';
import { forTime } from 'waitasecond';
import { LOOP_LIMIT } from '../../src/config';
import { $execCommand } from '../../src/utils/execCommand/$execCommand';
import { isFileExisting } from '../../src/utils/files/isFileExisting';
import { commit } from '../utils/autocommit/commit';
import { assertsError } from '../../src/errors/assertsError';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const program = new commander.Command();
program.parse(process.argv);

usePackages()
    .catch((error) => {
        assertsError(error);
        console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function usePackages() {
    console.info(`🌍  Using packages`);

    if (!process.env.USE_THIS_PACKAGE_PATHS) {
        console.warn(colors.yellow(`Warning: USE_THIS_PACKAGE_PATHS not defined in environment`));
    }

    // Note: Get the current version
    const mainPackageJson = JSON.parse(await readFile('./package.json', 'utf-8')) as PackageJson;
    const currentVersion = mainPackageJson.version!;

    // Note: Wait for the new version to be available in NPM
    for (let i = 0; i < LOOP_LIMIT; i++) {
        const result = await $execCommand({
            crashOnError: false,
            command: `npm show ptbk`,
        });

        if (result.includes(currentVersion)) {
            break;
        }

        console.warn(colors.gray(`Waiting for version ${currentVersion} to be available on NPM`));
        await forTime(1111 + 3333 * Math.random());
    }

    console.warn(colors.green(`Version ${currentVersion} is available on NPM`));
    await forTime(5 * 1000);

    // Note: Update the version in all packages
    for (const remoteFolder of [
        'examples/usage/other/vercel',
        ...(process.env.USE_THIS_PACKAGE_PATHS || '').split(','),
    ]) {
        const remotePackageJsonPath = join(remoteFolder, 'package.json');

        if (await isFileExisting(remotePackageJsonPath, fs)) {
            console.info(
                colors.blue(`Update version of @promptbook/* to ${currentVersion} in ${remotePackageJsonPath}`),
            );

            const remotePackageJson = JSON.parse(await readFile(remotePackageJsonPath, 'utf-8')) as PackageJson;

            for (const dependenciesType of ['dependencies', 'devDependencies']) {
                if (remotePackageJson[dependenciesType] === undefined) {
                    continue;
                }
                for (const packageName of Object.keys(remotePackageJson[dependenciesType] as Record<string, string>)) {
                    if (
                        !packageName.startsWith('@promptbook/') &&
                        packageName !== 'promptbook' &&
                        packageName !== 'ptbk'
                    ) {
                        continue;
                    }

                    remotePackageJson[dependenciesType]![packageName] = currentVersion;
                }
            }

            await writeFile(remotePackageJsonPath, JSON.stringify(remotePackageJson, null, 4) + '\n');

            await $execCommand({
                cwd: remoteFolder,
                crashOnError: false,
                command: `npm i`,
                isVerbose: true,
            });
        }

        const remoteDockerfilePath = join(remoteFolder, 'Dockerfile');

        if (await isFileExisting(remoteDockerfilePath, fs)) {
            console.info(
                colors.blue(`Update version of @promptbook/* to ${currentVersion} in ${remoteDockerfilePath}`),
            );

            const remoteDockerfile = await readFile(remoteDockerfilePath, 'utf-8');

            const updatedDockerfile = remoteDockerfile.replace(
                /^(FROM\s+(hejny\/promptbook)):[^-]+?-[^-]+?$/gm,
                `$1:${currentVersion}`,
            );

            await writeFile(remoteDockerfilePath, updatedDockerfile);
        }

        if (!remoteFolder.startsWith('..')) {
            // Note: No need to check that folder is clean, because this script is executed only after new version which can be triggered only from clean state
            await commit([remoteFolder], `⏫ Update Promptbook to \`${currentVersion}\` in \`${remoteFolder}\``);
        }
    }

    console.info(`[ 🌍  Using packages ]`);
}

/**
 * TODO: [🤣] Update in all places
 * TODO: [👵] test before publish
 * TODO: Add warning to the copy/used files
 * TODO: Use prettier to format the used files
 * TODO: Normalize order of keys in package.json
 * Note: [⚫] Code in this file should never be published in any package
 */
