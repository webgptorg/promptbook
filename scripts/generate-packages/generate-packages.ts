#!/usr/bin/env ts-node

import chalk from 'chalk';
import commander from 'commander';
import { join } from 'path';
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

    // TODO: !!! Filter out dependencies only for the current package
    // TODO: !!! Sync package name
    // TODO: !!! Sync typings in package.json
    // TODO: !!! Sync version + other stuff
    // TODO: !!! Sync Package.json + add copy warning
    // TODO: !!! Automatic script after build to generate theese things
    // TODO: !!! Automatic script for publishing packages to npm after version

    if (isCommited) {
        await commit('packages', `📦 Generating packages`);
    }

    console.info(`[ 📦  Generating packages ]`);
}
