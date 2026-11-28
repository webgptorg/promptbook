#!/usr/bin/env ts-node
// prettify-all.ts

import colors from 'colors';
import commander from 'commander';
import { basename, join } from 'path';
import { spaceTrim } from 'spacetrim';
import { $execCommand } from '../../src/_packages/node.index';
import { assertsError } from '../../src/errors/assertsError';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';
import { readAllProjectFiles } from '../utils/readAllProjectFiles';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(
        colors.red(
            spaceTrim(`
                CWD must be root of the project

                Script: prettify-all.ts
                Current CWD: ${process.cwd()}
                Expected CWD: ${join(__dirname, '../..')}
            `),
        ),
    );
    process.exit(1);
}

/**
 * Constant for program.
 */
const program = new commander.Command();
program.option('--commit', `Auto commit`, false);
program.option('--ignore-git-changes', `Ignore dirty working tree when using --commit`, false);
program.parse(process.argv);

/**
 * Constant for { commit: is commited, ignore git changes }.
 */
const { commit: isCommited, ignoreGitChanges } = program.opts();

/**
 * Go through all files in the project and prettify them
 */
prettifyAll({ isCommited, ignoreGitChanges })
    .catch((error) => {
        assertsError(error);
        console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

/**
 * Prettifies all.
 */
async function prettifyAll({
    isCommited,
    ignoreGitChanges,
}: {
    readonly isCommited: boolean;
    readonly ignoreGitChanges: boolean;
}) {
    console.info(`🏭🩹 Prettifying all files...`);

    if (isCommited && !ignoreGitChanges && !(await isWorkingTreeClean(process.cwd()))) {
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

// Note: [⚫] Code for repository script [prettify-all](scripts/prettify-all/prettify-all.ts) should never be published in any package
// TODO: Prettify also the `/apps` and `/scripts` folders
