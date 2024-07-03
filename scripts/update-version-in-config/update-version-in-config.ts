#!/usr/bin/env ts-node

import colors from 'colors';
import commander from 'commander';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { version } from '../../package.json';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const program = new commander.Command();
program.option('--commit', `Autocommit changes`, false);
program.parse(process.argv);

const { commit: isCommited } = program.opts();

generatePackages({ isCommited })
    .catch((error: Error) => {
        console.error(colors.bgRed(error.name));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function generatePackages({ isCommited }: { isCommited: boolean }) {
    console.info(`🆚 Update version in config`);

    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    await writeFile(
        `./src/version.ts`, // <- Note: [🏳‍🌈] Maybe use json file (used .ts file (not .json) to avoid support of json files in bundle)
        spaceTrim(`
            import type { string_version } from './types/typeAliases';

            /**
             * The version of the Promptbook library
             */
            export const PROMPTBOOK_VERSION: string_version = '${version}';
        `),
    );

    if (isCommited) {
        await commit('src', `🆚 Update version in config`);
    }
}
