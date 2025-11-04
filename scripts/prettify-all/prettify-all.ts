#!/usr/bin/env ts-node
// prettify-all.ts

import colors from 'colors';
import commander from 'commander';
import { basename, join } from 'path';
import { $execCommand } from '../../src/_packages/node.index';
import { assertsError } from '../../src/errors/assertsError';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';
import { readAllProjectFiles } from '../utils/readAllProjectFiles';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const program = new commander.Command();
program.option('--commit', `Auto commit`, false);
program.parse(process.argv);

const { commit: isCommited } = program.opts();

/**
 * Go through all files in the project and prettify them
 */
prettifyAll({ isCommited })
    .catch((error) => {
        assertsError(error);
        console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function prettifyAll({ isCommited }: { readonly isCommited: boolean }) {
    console.info(`🏭🩹 Prettifying all files...`);

    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    const files = await readAllProjectFiles();

    for (const file of files) {
        if (file.path === join(__dirname, '../../src/index.tsx').split('\\').join('/')) {
            continue;
        }

        if (file.path.includes('_packages')) {
            // Note: Do not repair imports in files which defines exported packages
            continue;
        }

        await $execCommand(`npx prettier --write "${file.path}"`);
        console.info(colors.green(`🧹 ${file.path}`));
    }

    if (isCommited) {
        await commit(['.'], `🧹 Prettify all files`);
    }
}

/**
 * TODO: Prettify also the `/apps` and `/scripts` folders
 * Note: [⚫] Code in this file should never be published in any package
 */
